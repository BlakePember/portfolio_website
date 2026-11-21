import { DurableObject } from 'cloudflare:workers';
import {
  ALL_SEATS,
  BoardId,
  PublicRoomSummary,
  RoomChatMessage,
  RoomState,
  RoomVisibility,
  SeatKey,
  SeatPlayer,
  TeamId,
  TimeControl,
  getSeatKey,
  getSeatTeam,
} from '../shared/types.js';
import {
  applyChessMove,
  applyDropMove,
  applyDuckMove,
  createInitialGame,
  resignGame,
  syncClocksInPlace,
} from '../shared/engine.js';
import { chooseBotAction } from '../shared/bot.js';
import { RoomClientMessage, RoomServerMessage } from '../shared/protocol.js';
import type { Env } from './env.js';

interface RoomAttachment {
  playerId: string;
  name: string;
}

interface BotSchedule {
  A?: number;
  B?: number;
}

const BOT_NAMES = ['QuackBot', 'MallardAI', 'DrakeEngine', 'DucklingPro', 'PekingGM', 'WaddleBot'];
const WAITING_RECONNECT_GRACE_MS = 15_000;
const EMPTY_CLEANUP_DELAY_MS = 3 * 60_000;

function makeSystemMessage(text: string): RoomChatMessage {
  return {
    id: `sys_${crypto.randomUUID()}`,
    senderName: 'System',
    seat: 'system',
    team: null,
    text,
    scope: 'all',
    timestamp: Date.now(),
  };
}

function randomDelay(minMs: number, spreadMs: number): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return minMs + (arr[0] % spreadMs);
}

export class RoomDO extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS room_kv (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);
    });
  }

  // --- Storage helpers (SQLite-first persistence) ---

  private loadState(): RoomState | null {
    const row = this.ctx.storage.sql
      .exec<{ value: string }>("SELECT value FROM room_kv WHERE key = 'state'")
      .toArray()[0];
    if (!row) return null;
    try {
      return JSON.parse(row.value) as RoomState;
    } catch {
      return null;
    }
  }

  private saveState(state: RoomState): void {
    this.ctx.storage.sql.exec(
      "INSERT OR REPLACE INTO room_kv (key, value) VALUES ('state', ?)",
      JSON.stringify(state)
    );
  }

  private loadBotSchedule(): BotSchedule {
    const row = this.ctx.storage.sql
      .exec<{ value: string }>("SELECT value FROM room_kv WHERE key = 'bot_due'")
      .toArray()[0];
    if (!row) return {};
    try {
      return JSON.parse(row.value) as BotSchedule;
    } catch {
      return {};
    }
  }

  private saveBotSchedule(schedule: BotSchedule): void {
    this.ctx.storage.sql.exec(
      "INSERT OR REPLACE INTO room_kv (key, value) VALUES ('bot_due', ?)",
      JSON.stringify(schedule)
    );
  }

  private loadMetaNumber(key: string): number {
    const row = this.ctx.storage.sql
      .exec<{ value: string }>('SELECT value FROM room_kv WHERE key = ?', key)
      .toArray()[0];
    return row ? Number(row.value) || 0 : 0;
  }

  private saveMetaNumber(key: string, val: number): void {
    this.ctx.storage.sql.exec(
      'INSERT OR REPLACE INTO room_kv (key, value) VALUES (?, ?)',
      key,
      String(val)
    );
  }

  private clearAllStorage(): void {
    this.ctx.storage.sql.exec('DELETE FROM room_kv');
  }

  // --- RPC methods called by Worker & LobbyDO ---

  async roomExists(): Promise<boolean> {
    return this.loadState() !== null;
  }

  async initRoom(params: {
    code: string;
    name: string;
    visibility: RoomVisibility;
    timeControl: TimeControl;
    hostId: string;
    hostName: string;
  }): Promise<RoomState> {
    const state: RoomState = {
      code: params.code,
      name: params.name,
      visibility: params.visibility,
      hostId: params.hostId,
      timeControl: params.timeControl,
      seats: {
        A_w: {
          id: params.hostId,
          name: params.hostName,
          isBot: false,
          connected: false,
          ready: true,
        },
        B_b: null,
        A_b: null,
        B_w: null,
      },
      spectators: [],
      game: createInitialGame(params.timeControl, 'waiting'),
      chat: [makeSystemMessage(`Room ${params.code} created (${params.timeControl.label}, ${params.visibility}).`)],
      createdAt: Date.now(),
    };

    this.saveState(state);
    this.saveBotSchedule({});
    // Set an idle cleanup alarm in case the creator never connects a socket
    this.saveMetaNumber('empty_since', Date.now());
    await this.ctx.storage.setAlarm(Date.now() + EMPTY_CLEANUP_DELAY_MS);
    await this.syncLobbySummary(state);

    return this.sanitizeRoomForPlayer(state, params.hostId);
  }

  async initQuickMatch(params: {
    code: string;
    timeControl: TimeControl;
    players: { id: string; name: string }[];
  }): Promise<RoomState> {
    const [p0, p1, p2, p3] = params.players;
    const state: RoomState = {
      code: params.code,
      name: `Quick Match · ${params.timeControl.label}`,
      visibility: 'private',
      hostId: p0.id,
      timeControl: params.timeControl,
      seats: {
        A_w: { id: p0.id, name: p0.name, isBot: false, connected: false, ready: true },
        B_b: { id: p1.id, name: p1.name, isBot: false, connected: false, ready: true },
        A_b: { id: p2.id, name: p2.name, isBot: false, connected: false, ready: true },
        B_w: { id: p3.id, name: p3.name, isBot: false, connected: false, ready: true },
      },
      spectators: [],
      game: createInitialGame(params.timeControl, 'playing'),
      chat: [makeSystemMessage(`Random match found! (${params.timeControl.label}) — Good luck!`)],
      createdAt: Date.now(),
    };

    this.saveState(state);
    this.saveBotSchedule({});
    this.saveMetaNumber('empty_since', 0);
    this.saveMetaNumber('last_clock_sync', Date.now());
    await this.scheduleNextAlarm(state);
    return state;
  }

  // --- WebSocket Hibernation lifecycle ---

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const url = new URL(request.url);
    const playerId = (url.searchParams.get('playerId') || '').trim().slice(0, 64) || crypto.randomUUID();
    const name = (url.searchParams.get('name') || 'Player').trim().slice(0, 20) || 'Player';

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);

    const state = this.loadState();
    if (!state) {
      this.sendJson(server, { type: 'room:error', error: 'Room not found or already closed.' });
      server.close(4004, 'Room not found');
      return new Response(null, { status: 101, webSocket: client });
    }

    server.serializeAttachment({ playerId, name } satisfies RoomAttachment);
    this.saveMetaNumber('empty_since', 0);

    // Seat player or mark reconnected
    const existingSeat = this.findPlayerSeat(state, playerId);
    if (existingSeat) {
      const sp = state.seats[existingSeat]!;
      sp.connected = true;
      sp.name = name;
    } else if (state.game.status === 'waiting') {
      const openSeat = ALL_SEATS.find((s) => state.seats[s] === null);
      if (openSeat) {
        state.seats[openSeat] = {
          id: playerId,
          name,
          isBot: false,
          connected: true,
          ready: true,
        };
        state.chat.push(makeSystemMessage(`${name} joined seat ${openSeat}.`));
      } else {
        if (!state.spectators.some((s) => s.id === playerId)) {
          state.spectators.push({ id: playerId, name });
        }
        state.chat.push(makeSystemMessage(`${name} joined as spectator.`));
      }
    } else {
      if (!state.spectators.some((s) => s.id === playerId)) {
        state.spectators.push({ id: playerId, name });
      }
    }

    this.saveState(state);
    this.broadcastRoomState(state);
    await this.syncLobbySummary(state);

    if (state.game.status === 'playing') {
      await this.scheduleNextAlarm(state);
    } else {
      await this.ctx.storage.deleteAlarm();
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return;
    let msg: RoomClientMessage;
    try {
      msg = JSON.parse(message) as RoomClientMessage;
    } catch {
      return;
    }

    const att = this.getAttachment(ws);
    if (!att) return;

    if (msg.type === 'ping') {
      this.sendJson(ws, { type: 'pong' });
      return;
    }

    const state = this.loadState();
    if (!state) {
      this.sendJson(ws, { type: 'room:error', error: 'Room has closed.' });
      return;
    }

    switch (msg.type) {
      case 'player:identify': {
        const cleanName = (msg.name || 'Player').trim().slice(0, 20) || 'Player';
        ws.serializeAttachment({ ...att, name: cleanName });
        const seat = this.findPlayerSeat(state, att.playerId);
        if (seat && state.seats[seat]) {
          state.seats[seat]!.name = cleanName;
        }
        for (const spec of state.spectators) {
          if (spec.id === att.playerId) spec.name = cleanName;
        }
        this.saveState(state);
        this.broadcastRoomState(state);
        await this.syncLobbySummary(state);
        return;
      }

      case 'room:leave': {
        await this.removePlayerFromRoom(state, att.playerId, att.name, ws, true);
        try {
          ws.close(1000, 'Left room');
        } catch {
          // Ignore
        }
        return;
      }

      case 'room:takeSeat': {
        if (state.game.status !== 'waiting') return;
        if (!ALL_SEATS.includes(msg.seat) || state.seats[msg.seat] !== null) return;
        const currSeat = this.findPlayerSeat(state, att.playerId);
        if (currSeat) {
          state.seats[currSeat] = null;
        } else {
          state.spectators = state.spectators.filter((s) => s.id !== att.playerId);
        }
        state.seats[msg.seat] = {
          id: att.playerId,
          name: att.name,
          isBot: false,
          connected: true,
          ready: true,
        };
        this.saveState(state);
        this.broadcastRoomState(state);
        await this.syncLobbySummary(state);
        return;
      }

      case 'room:addBot': {
        if (state.hostId !== att.playerId || state.game.status !== 'waiting') return;
        const seatsToFill: SeatKey[] = msg.seat
          ? state.seats[msg.seat] === null
            ? [msg.seat]
            : []
          : ALL_SEATS.filter((s) => state.seats[s] === null);

        for (const seat of seatsToFill) {
          const usedNames = new Set(ALL_SEATS.map((s) => state.seats[s]?.name).filter(Boolean));
          const botName =
            BOT_NAMES.find((n) => !usedNames.has(n)) ??
            `DuckBot ${10 + (crypto.getRandomValues(new Uint32Array(1))[0] % 89)}`;
          state.seats[seat] = {
            id: `bot_${seat}_${crypto.randomUUID().slice(0, 6)}`,
            name: botName,
            isBot: true,
            connected: true,
            ready: true,
          };
        }
        if (seatsToFill.length > 0) {
          this.saveState(state);
          this.broadcastRoomState(state);
          await this.syncLobbySummary(state);
        }
        return;
      }

      case 'room:removeBot': {
        if (state.hostId !== att.playerId || state.game.status !== 'waiting') return;
        if (state.seats[msg.seat]?.isBot) {
          state.seats[msg.seat] = null;
          this.saveState(state);
          this.broadcastRoomState(state);
          await this.syncLobbySummary(state);
        }
        return;
      }

      case 'room:start': {
        if (state.hostId !== att.playerId) {
          if (msg.reqId) this.sendJson(ws, { type: 'ack', reqId: msg.reqId, ok: false, error: 'Only the host can start the game.' });
          return;
        }
        const emptySeats = ALL_SEATS.filter((s) => state.seats[s] === null);
        if (emptySeats.length > 0) {
          if (msg.reqId) {
            this.sendJson(ws, {
              type: 'ack',
              reqId: msg.reqId,
              ok: false,
              error: 'All 4 seats must be filled (add players or bots) before starting.',
            });
          }
          return;
        }

        state.game = createInitialGame(state.timeControl, 'playing');
        state.chat.push(makeSystemMessage('Match started! Make your move, then move the duck!'));
        this.saveState(state);
        this.saveBotSchedule({});
        this.saveMetaNumber('last_clock_sync', Date.now());
        this.broadcastRoomState(state);
        await this.syncLobbySummary(state);
        await this.scheduleNextAlarm(state);
        if (msg.reqId) this.sendJson(ws, { type: 'ack', reqId: msg.reqId, ok: true });
        return;
      }

      case 'room:rematch': {
        if (state.game.status !== 'finished') return;
        if (ALL_SEATS.some((s) => state.seats[s] === null)) return;
        const old = { ...state.seats };
        state.seats = {
          A_w: old.A_b,
          A_b: old.A_w,
          B_w: old.B_b,
          B_b: old.B_w,
        };
        state.game = createInitialGame(state.timeControl, 'playing');
        state.chat.push(makeSystemMessage(`${att.name} started a rematch (colors swapped)!`));
        this.saveState(state);
        this.saveBotSchedule({});
        this.saveMetaNumber('last_clock_sync', Date.now());
        this.broadcastRoomState(state);
        await this.syncLobbySummary(state);
        await this.scheduleNextAlarm(state);
        return;
      }

      case 'game:move': {
        const board = state.game.boards[msg.boardId];
        if (!board) {
          if (msg.reqId) this.sendJson(ws, { type: 'ack', reqId: msg.reqId, ok: false, error: 'Invalid board.' });
          return;
        }
        const activeSeat = getSeatKey(msg.boardId, board.turn);
        if (state.seats[activeSeat]?.id !== att.playerId) {
          if (msg.reqId) this.sendJson(ws, { type: 'ack', reqId: msg.reqId, ok: false, error: 'Not your turn on this board.' });
          return;
        }
        const res = applyChessMove(state.game, msg.boardId, msg.from, msg.to, msg.promotion);
        if (!res.ok) {
          if (msg.reqId) this.sendJson(ws, { type: 'ack', reqId: msg.reqId, ok: false, error: res.error });
          return;
        }
        state.game = res.state;
        if (res.kingCaptured) {
          state.chat.push(
            makeSystemMessage(`👑 King captured on Board ${msg.boardId}! Team ${state.game.winnerTeam} wins!`)
          );
        }
        this.saveState(state);
        this.broadcastRoomState(state);
        if (res.kingCaptured) {
          await this.ctx.storage.deleteAlarm();
          await this.syncLobbySummary(state);
        } else {
          await this.scheduleNextAlarm(state);
        }
        if (msg.reqId) this.sendJson(ws, { type: 'ack', reqId: msg.reqId, ok: true });
        return;
      }

      case 'game:drop': {
        const board = state.game.boards[msg.boardId];
        if (!board) {
          if (msg.reqId) this.sendJson(ws, { type: 'ack', reqId: msg.reqId, ok: false, error: 'Invalid board.' });
          return;
        }
        const activeSeat = getSeatKey(msg.boardId, board.turn);
        if (state.seats[activeSeat]?.id !== att.playerId) {
          if (msg.reqId) this.sendJson(ws, { type: 'ack', reqId: msg.reqId, ok: false, error: 'Not your turn on this board.' });
          return;
        }
        const res = applyDropMove(state.game, msg.boardId, msg.pieceType, msg.to);
        if (!res.ok) {
          if (msg.reqId) this.sendJson(ws, { type: 'ack', reqId: msg.reqId, ok: false, error: res.error });
          return;
        }
        state.game = res.state;
        this.saveState(state);
        this.broadcastRoomState(state);
        await this.scheduleNextAlarm(state);
        if (msg.reqId) this.sendJson(ws, { type: 'ack', reqId: msg.reqId, ok: true });
        return;
      }

      case 'game:duck': {
        const board = state.game.boards[msg.boardId];
        if (!board) {
          if (msg.reqId) this.sendJson(ws, { type: 'ack', reqId: msg.reqId, ok: false, error: 'Invalid board.' });
          return;
        }
        const activeSeat = getSeatKey(msg.boardId, board.turn);
        if (state.seats[activeSeat]?.id !== att.playerId) {
          if (msg.reqId) this.sendJson(ws, { type: 'ack', reqId: msg.reqId, ok: false, error: 'Not your turn to move the duck.' });
          return;
        }
        const res = applyDuckMove(state.game, msg.boardId, msg.to, state.timeControl.incrementMs);
        if (!res.ok) {
          if (msg.reqId) this.sendJson(ws, { type: 'ack', reqId: msg.reqId, ok: false, error: res.error });
          return;
        }
        state.game = res.state;
        this.saveState(state);
        this.broadcastRoomState(state);
        await this.scheduleNextAlarm(state);
        if (msg.reqId) this.sendJson(ws, { type: 'ack', reqId: msg.reqId, ok: true });
        return;
      }

      case 'game:resign': {
        if (state.game.status !== 'playing') return;
        const seat = this.findPlayerSeat(state, att.playerId);
        if (!seat) return;
        const team = getSeatTeam(seat);
        const boardId: BoardId = seat.startsWith('A') ? 'A' : 'B';
        state.game = resignGame(state.game, team, boardId);
        state.chat.push(makeSystemMessage(`${att.name} resigned. Team ${state.game.winnerTeam} wins!`));
        this.saveState(state);
        this.broadcastRoomState(state);
        await this.ctx.storage.deleteAlarm();
        await this.syncLobbySummary(state);
        return;
      }

      case 'room:chat': {
        const text = (msg.text || '').trim().slice(0, 220);
        if (!text) return;
        const seat = this.findPlayerSeat(state, att.playerId);
        const team: TeamId | null = seat ? getSeatTeam(seat) : null;
        const scope: 'all' | 'team' = msg.scope === 'team' && team !== null ? 'team' : 'all';
        const chatMsg: RoomChatMessage = {
          id: `msg_${crypto.randomUUID()}`,
          senderName: att.name,
          seat: seat ?? 'spectator',
          team,
          text,
          scope,
          timestamp: Date.now(),
        };
        state.chat.push(chatMsg);
        if (state.chat.length > 80) state.chat = state.chat.slice(-80);
        this.saveState(state);
        this.broadcastRoomState(state);
        return;
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    if (code >= 1000 && code < 5000 && ![1004, 1005, 1006, 1015].includes(code)) {
      ws.close(code, reason);
    } else {
      ws.close();
    }

    const att = this.getAttachment(ws);
    const state = this.loadState();
    if (!att || !state) return;

    await this.removePlayerFromRoom(state, att.playerId, att.name, ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    try {
      ws.close();
    } catch {
      // Ignore
    }
    const att = this.getAttachment(ws);
    const state = this.loadState();
    if (!att || !state) return;
    await this.removePlayerFromRoom(state, att.playerId, att.name, ws);
  }

  // --- Per-room Durable Object Alarm (Clocks, Bots & Empty-Room Cleanup) ---

  async alarm(): Promise<void> {
    const state = this.loadState();
    if (!state) return;

    const now = Date.now();
    const emptySince = this.loadMetaNumber('empty_since');
    const cleanupDelay = state.game.status === 'waiting' ? WAITING_RECONNECT_GRACE_MS : EMPTY_CLEANUP_DELAY_MS;
    if (emptySince > 0 && now - emptySince >= cleanupDelay && this.ctx.getWebSockets().length === 0) {
      const code = state.code;
      this.clearAllStorage();
      await this.ctx.storage.deleteAlarm();
      await this.env.LOBBY.getByName('global').removeRoomSummary(code);
      return;
    }

    // In waiting rooms, prune any disconnected seat after the grace period if other players remain
    if (state.game.status === 'waiting') {
      let pruned = false;
      for (const seat of ALL_SEATS) {
        const sp = state.seats[seat];
        if (sp && !sp.isBot && !sp.connected) {
          state.seats[seat] = null;
          state.chat.push(makeSystemMessage(`${sp.name} disconnected from the lobby.`));
          pruned = true;
        }
      }
      if (pruned) {
        this.reassignHostIfNeeded(state);
        this.saveState(state);
        this.broadcastRoomState(state);
        await this.syncLobbySummary(state);
      }
      return;
    }

    if (state.game.status !== 'playing') {
      return;
    }

    let stateChanged = false;

    // 1. Tick clocks & check timeout
    const flagged = syncClocksInPlace(state.game, now);
    if (flagged) {
      state.chat.push(
        makeSystemMessage(`⏱️ Time expired on Board ${state.game.winningBoard}! Team ${state.game.winnerTeam} wins!`)
      );
      this.saveState(state);
      this.saveBotSchedule({});
      this.broadcastRoomState(state);
      await this.syncLobbySummary(state);
      return;
    }

    // 2. Execute any due bot actions
    const botSchedule = this.loadBotSchedule();
    for (const boardId of ['A', 'B'] as BoardId[]) {
      if (state.game.status !== 'playing') break;
      const due = botSchedule[boardId];
      const board = state.game.boards[boardId];
      const activeSeat = getSeatKey(boardId, board.turn);
      const occupant = state.seats[activeSeat];

      if (!occupant?.isBot) {
        if (due !== undefined) delete botSchedule[boardId];
        continue;
      }

      if (due !== undefined && due <= now) {
        delete botSchedule[boardId];
        const action = chooseBotAction(state.game, boardId);
        if (action) {
          let res;
          if (action.kind === 'move') {
            res = applyChessMove(state.game, boardId, action.from, action.to, action.promotion, now);
          } else if (action.kind === 'drop') {
            res = applyDropMove(state.game, boardId, action.pieceType, action.to, now);
          } else {
            res = applyDuckMove(state.game, boardId, action.to, state.timeControl.incrementMs, now);
          }

          if (res.ok) {
            state.game = res.state;
            stateChanged = true;
            if (res.kingCaptured) {
              state.chat.push(
                makeSystemMessage(
                  `👑 ${occupant.name} captured the King on Board ${boardId}! Team ${state.game.winnerTeam} wins!`
                )
              );
              this.saveState(state);
              this.saveBotSchedule({});
              this.broadcastRoomState(state);
              await this.syncLobbySummary(state);
              return;
            }
          }
        }
      }
    }

    this.saveState(state);
    this.saveBotSchedule(botSchedule);

    if (stateChanged) {
      this.broadcastRoomState(state);
    } else {
      const lastClockSync = this.loadMetaNumber('last_clock_sync');
      if (now - lastClockSync >= 950) {
        this.saveMetaNumber('last_clock_sync', now);
        this.broadcastClocks(state);
      }
    }

    await this.scheduleNextAlarm(state);
  }

  private async scheduleNextAlarm(state: RoomState): Promise<void> {
    if (state.game.status !== 'playing') return;

    const now = Date.now();
    const botSchedule = this.loadBotSchedule();
    let scheduleDirty = false;
    let nextDue = now + 1000;

    for (const boardId of ['A', 'B'] as BoardId[]) {
      const board = state.game.boards[boardId];
      const activeSeat = getSeatKey(boardId, board.turn);
      const occupant = state.seats[activeSeat];

      // Clock flag deadline
      const remaining = state.game.clocks[activeSeat];
      if (remaining > 0) {
        nextDue = Math.min(nextDue, now + Math.max(100, remaining + 25));
      }

      if (occupant?.isBot) {
        if (!botSchedule[boardId]) {
          const delay = board.phase === 'chess' ? randomDelay(600, 480) : randomDelay(360, 280);
          botSchedule[boardId] = now + delay;
          scheduleDirty = true;
        }
        nextDue = Math.min(nextDue, botSchedule[boardId]!);
      } else if (botSchedule[boardId]) {
        delete botSchedule[boardId];
        scheduleDirty = true;
      }
    }

    if (scheduleDirty) {
      this.saveBotSchedule(botSchedule);
    }

    await this.ctx.storage.setAlarm(Math.max(now + 120, nextDue));
  }

  private async removePlayerFromRoom(
    state: RoomState,
    playerId: string,
    playerName: string,
    closingWs: WebSocket,
    explicitLeave = false
  ): Promise<void> {
    const remainingSockets = this.ctx.getWebSockets().filter((s) => s !== closingWs);
    const hasOtherSocket = remainingSockets.some((s) => this.getAttachment(s)?.playerId === playerId);
    if (hasOtherSocket) return;

    const seat = this.findPlayerSeat(state, playerId);
    if (seat) {
      if (state.game.status === 'waiting' && explicitLeave) {
        state.seats[seat] = null;
        state.chat.push(makeSystemMessage(`${playerName} left the room.`));
        this.reassignHostIfNeeded(state);
      } else {
        const sp = state.seats[seat];
        if (sp) sp.connected = false;
        if (state.game.status !== 'waiting') {
          state.chat.push(makeSystemMessage(`${playerName} disconnected.`));
        }
      }
    } else {
      state.spectators = state.spectators.filter((s) => s.id !== playerId);
    }

    const noHumansConnected = !ALL_SEATS.some((s) => {
      const p = state.seats[s];
      return p !== null && !p.isBot && p.connected;
    }) && state.spectators.length === 0;

    if (noHumansConnected && state.game.status === 'waiting' && explicitLeave) {
      const code = state.code;
      this.clearAllStorage();
      await this.ctx.storage.deleteAlarm();
      await this.env.LOBBY.getByName('global').removeRoomSummary(code);
      return;
    }

    if (noHumansConnected) {
      // Keep room alive briefly during browser refresh, then auto-cleanup via Durable Object Alarm
      const delay = state.game.status === 'waiting' ? WAITING_RECONNECT_GRACE_MS : EMPTY_CLEANUP_DELAY_MS;
      this.saveMetaNumber('empty_since', Date.now());
      if (state.game.status !== 'playing') {
        await this.ctx.storage.setAlarm(Date.now() + delay);
      }
    } else if (state.game.status === 'waiting' && !explicitLeave) {
      // Schedule grace-period pruning for disconnected seat while others stay
      await this.ctx.storage.setAlarm(Date.now() + WAITING_RECONNECT_GRACE_MS);
    }

    this.saveState(state);
    this.broadcastRoomState(state, closingWs);
    await this.syncLobbySummary(state);
  }

  private reassignHostIfNeeded(state: RoomState): void {
    const hostPresent = ALL_SEATS.some((s) => state.seats[s]?.id === state.hostId);
    if (hostPresent) return;
    const nextHuman = ALL_SEATS.find((s) => state.seats[s] !== null && !state.seats[s]!.isBot);
    if (nextHuman) {
      state.hostId = state.seats[nextHuman]!.id;
    }
  }

  private findPlayerSeat(state: RoomState, playerId: string): SeatKey | null {
    for (const seat of ALL_SEATS) {
      if (state.seats[seat]?.id === playerId) return seat;
    }
    return null;
  }

  private sanitizeRoomForPlayer(state: RoomState, playerId: string): RoomState {
    const seat = this.findPlayerSeat(state, playerId);
    const myTeam = seat ? getSeatTeam(seat) : null;
    return {
      ...state,
      chat: state.chat.filter((m) => m.scope === 'all' || (myTeam !== null && m.team === myTeam)),
    };
  }

  private broadcastRoomState(state: RoomState, excluding?: WebSocket): void {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === excluding) continue;
      const att = this.getAttachment(ws);
      if (!att) continue;
      this.sendJson(ws, {
        type: 'room:state',
        room: this.sanitizeRoomForPlayer(state, att.playerId),
      });
    }
  }

  private broadcastClocks(state: RoomState): void {
    const payload = JSON.stringify({
      type: 'game:clocks',
      clocks: state.game.clocks,
      lastClockTickAt: state.game.lastClockTickAt,
    } satisfies RoomServerMessage);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
        // Ignore broken socket
      }
    }
  }

  private async syncLobbySummary(state: RoomState): Promise<void> {
    if (state.visibility !== 'public') return;

    let humanCount = 0;
    let botCount = 0;
    let openSeats = 0;
    for (const seat of ALL_SEATS) {
      const p = state.seats[seat];
      if (!p) openSeats++;
      else if (p.isBot) botCount++;
      else humanCount++;
    }
    const hostSeat = ALL_SEATS.find((s) => state.seats[s]?.id === state.hostId);
    const hostName = (hostSeat && state.seats[hostSeat]?.name) || 'Host';

    const summary: PublicRoomSummary = {
      code: state.code,
      name: state.name,
      hostName,
      timeControl: state.timeControl,
      status: state.game.status,
      humanCount,
      botCount,
      openSeats,
      createdAt: state.createdAt,
    };

    await this.env.LOBBY.getByName('global').upsertRoomSummary(summary);
  }

  private getAttachment(ws: WebSocket): RoomAttachment | null {
    try {
      return (ws.deserializeAttachment() as RoomAttachment | null) ?? null;
    } catch {
      return null;
    }
  }

  private sendJson(ws: WebSocket, msg: RoomServerMessage): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // Ignore closed socket
    }
  }
}
