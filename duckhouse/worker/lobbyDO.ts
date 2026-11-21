import { DurableObject } from 'cloudflare:workers';
import {
  MatchmakingStatus,
  PublicRoomSummary,
  RoomState,
  RoomVisibility,
  TIME_CONTROLS,
  TimeControl,
} from '../shared/types.js';
import { LobbyClientMessage, LobbyServerMessage } from '../shared/protocol.js';
import type { Env } from './env.js';

interface LobbyAttachment {
  playerId: string;
  name: string;
  queueTcId: string | null;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_TTL_MS = 4 * 60 * 60 * 1000;

function secureRandomIndex(max: number): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}

function generateSecureRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[secureRandomIndex(CODE_CHARS.length)];
  }
  return code;
}

function findTimeControl(id?: string): TimeControl {
  return TIME_CONTROLS.find((tc) => tc.id === id) ?? TIME_CONTROLS[2];
}

function secureShuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = secureRandomIndex(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export class LobbyDO extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS public_rooms (
          code TEXT PRIMARY KEY,
          summary_json TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `);
    });
  }

  // --- RPC methods called by Worker & RoomDO ---

  async getPublicRooms(): Promise<PublicRoomSummary[]> {
    const cutoff = Date.now() - ROOM_TTL_MS;
    this.ctx.storage.sql.exec('DELETE FROM public_rooms WHERE updated_at < ?', cutoff);

    const rows = this.ctx.storage.sql
      .exec<{ summary_json: string }>('SELECT summary_json FROM public_rooms')
      .toArray();

    const summaries: PublicRoomSummary[] = [];
    for (const row of rows) {
      try {
        summaries.push(JSON.parse(row.summary_json) as PublicRoomSummary);
      } catch {
        // Ignore malformed row
      }
    }

    return summaries.sort((a, b) => {
      const aOpen = a.status === 'waiting' && a.openSeats > 0 ? 1 : 0;
      const bOpen = b.status === 'waiting' && b.openSeats > 0 ? 1 : 0;
      if (aOpen !== bOpen) return bOpen - aOpen;
      return b.createdAt - a.createdAt;
    });
  }

  async upsertRoomSummary(summary: PublicRoomSummary): Promise<void> {
    this.ctx.storage.sql.exec(
      'INSERT OR REPLACE INTO public_rooms (code, summary_json, updated_at) VALUES (?, ?, ?)',
      summary.code,
      JSON.stringify(summary),
      Date.now()
    );
    await this.broadcastPublicRooms();
  }

  async removeRoomSummary(code: string): Promise<void> {
    this.ctx.storage.sql.exec('DELETE FROM public_rooms WHERE code = ?', code);
    await this.broadcastPublicRooms();
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
    const attachment: LobbyAttachment = {
      playerId,
      name,
      queueTcId: null,
    };
    server.serializeAttachment(attachment);

    // Send initial snapshot immediately
    const rooms = await this.getPublicRooms();
    this.sendJson(server, { type: 'lobby:rooms', rooms });
    this.broadcastMatchmakingStatus();

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return;
    let msg: LobbyClientMessage;
    try {
      msg = JSON.parse(message) as LobbyClientMessage;
    } catch {
      return;
    }

    const att = this.getAttachment(ws);
    if (!att) return;

    if (msg.type === 'ping') {
      this.sendJson(ws, { type: 'pong' });
      return;
    }

    if (msg.type === 'player:identify') {
      const cleanName = (msg.name || 'Player').trim().slice(0, 20) || 'Player';
      ws.serializeAttachment({ ...att, name: cleanName });
      return;
    }

    if (msg.type === 'lobby:list') {
      const rooms = await this.getPublicRooms();
      if (msg.reqId) {
        this.sendJson(ws, { type: 'ack', reqId: msg.reqId, ok: true, rooms });
      } else {
        this.sendJson(ws, { type: 'lobby:rooms', rooms });
      }
      return;
    }

    if (msg.type === 'room:create') {
      // Remove player from matchmaking queue if creating a room
      if (att.queueTcId) {
        ws.serializeAttachment({ ...att, queueTcId: null });
        this.broadcastMatchmakingStatus();
      }

      const tc = findTimeControl(msg.timeControlId);
      const visibility: RoomVisibility = msg.visibility === 'private' ? 'private' : 'public';
      const roomName = (msg.name || `${att.name}'s Table`).trim().slice(0, 36) || `${att.name}'s Table`;

      // Allocate a unique code
      let code = generateSecureRoomCode();
      for (let attempt = 0; attempt < 8; attempt++) {
        const exists = await this.env.ROOMS.getByName(code).roomExists();
        if (!exists) break;
        code = generateSecureRoomCode();
      }

      const roomStub = this.env.ROOMS.getByName(code);
      const created: RoomState = await roomStub.initRoom({
        code,
        name: roomName,
        visibility,
        timeControl: tc,
        hostId: att.playerId,
        hostName: att.name,
      });

      if (msg.reqId) {
        this.sendJson(ws, { type: 'ack', reqId: msg.reqId, ok: true, room: created });
      }
      return;
    }

    if (msg.type === 'matchmaking:join') {
      const tc = findTimeControl(msg.timeControlId);
      // Clear any other sockets from the same playerId in queue so one user can't double-queue
      for (const other of this.ctx.getWebSockets()) {
        const oAtt = this.getAttachment(other);
        if (oAtt && oAtt.playerId === att.playerId && other !== ws && oAtt.queueTcId !== null) {
          other.serializeAttachment({ ...oAtt, queueTcId: null });
        }
      }
      ws.serializeAttachment({ ...att, queueTcId: tc.id });
      await this.tryFormMatch(tc);
      this.broadcastMatchmakingStatus();
      return;
    }

    if (msg.type === 'matchmaking:leave') {
      if (att.queueTcId !== null) {
        ws.serializeAttachment({ ...att, queueTcId: null });
        this.broadcastMatchmakingStatus();
      }
      return;
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    if (code >= 1000 && code < 5000 && ![1004, 1005, 1006, 1015].includes(code)) {
      ws.close(code, reason);
    } else {
      ws.close();
    }
    this.broadcastMatchmakingStatus(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    try {
      ws.close();
    } catch {
      // Ignore already-closed socket
    }
    this.broadcastMatchmakingStatus(ws);
  }

  private async tryFormMatch(tc: TimeControl): Promise<void> {
    const queued: { ws: WebSocket; att: LobbyAttachment }[] = [];
    const seenPlayers = new Set<string>();

    for (const sock of this.ctx.getWebSockets()) {
      const att = this.getAttachment(sock);
      if (!att || att.queueTcId !== tc.id) continue;
      if (seenPlayers.has(att.playerId)) continue;
      seenPlayers.add(att.playerId);
      queued.push({ ws: sock, att });
      if (queued.length === 4) break;
    }

    if (queued.length < 4) return;

    const shuffled = secureShuffle(queued);
    let code = generateSecureRoomCode();
    for (let attempt = 0; attempt < 8; attempt++) {
      const exists = await this.env.ROOMS.getByName(code).roomExists();
      if (!exists) break;
      code = generateSecureRoomCode();
    }

    const roomStub = this.env.ROOMS.getByName(code);
    const room = await roomStub.initQuickMatch({
      code,
      timeControl: tc,
      players: shuffled.map((entry) => ({
        id: entry.att.playerId,
        name: entry.att.name,
      })),
    });

    for (const entry of shuffled) {
      entry.ws.serializeAttachment({ ...entry.att, queueTcId: null });
      this.sendJson(entry.ws, {
        type: 'matchmaking:matched',
        code,
        room,
      });
    }
  }

  private getAttachment(ws: WebSocket): LobbyAttachment | null {
    try {
      return (ws.deserializeAttachment() as LobbyAttachment | null) ?? null;
    } catch {
      return null;
    }
  }

  private async broadcastPublicRooms(): Promise<void> {
    const rooms = await this.getPublicRooms();
    const payload = JSON.stringify({ type: 'lobby:rooms', rooms } satisfies LobbyServerMessage);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
        // Ignore broken socket
      }
    }
  }

  private broadcastMatchmakingStatus(excluding?: WebSocket): void {
    const sockets = this.ctx.getWebSockets().filter((s) => s !== excluding);
    const uniquePlayers = new Set<string>();
    const queueCountsByTc: Record<string, number> = {};
    for (const tc of TIME_CONTROLS) {
      queueCountsByTc[tc.id] = 0;
    }

    const queuedSeenByTc = new Map<string, Set<string>>();
    for (const ws of sockets) {
      const att = this.getAttachment(ws);
      if (!att) continue;
      uniquePlayers.add(att.playerId);
      if (att.queueTcId) {
        let set = queuedSeenByTc.get(att.queueTcId);
        if (!set) {
          set = new Set();
          queuedSeenByTc.set(att.queueTcId, set);
        }
        if (!set.has(att.playerId)) {
          set.add(att.playerId);
          queueCountsByTc[att.queueTcId] = (queueCountsByTc[att.queueTcId] ?? 0) + 1;
        }
      }
    }

    const onlineCount = Math.max(1, uniquePlayers.size);

    for (const ws of sockets) {
      const att = this.getAttachment(ws);
      if (!att) continue;
      const status: MatchmakingStatus = {
        inQueue: att.queueTcId !== null,
        timeControlId: att.queueTcId,
        queueCount: att.queueTcId ? queueCountsByTc[att.queueTcId] ?? 0 : 0,
        needed: 4,
        queueCountsByTc,
        onlineCount,
      };
      this.sendJson(ws, { type: 'matchmaking:status', status });
    }
  }

  private sendJson(ws: WebSocket, msg: LobbyServerMessage): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // Ignore closed socket
    }
  }
}
