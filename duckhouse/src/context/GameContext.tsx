import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ALL_SEATS,
  BoardId,
  ChessMoveInput,
  DropMoveInput,
  DuckMoveInput,
  GameState,
  MatchmakingStatus,
  PublicRoomSummary,
  RoomState,
  RoomVisibility,
  SeatKey,
  TIME_CONTROLS,
  TimeControl,
  getSeatKey,
  getSeatTeam,
} from '../../shared/types';
import {
  applyChessMove,
  applyDropMove,
  applyDuckMove,
  createInitialGame,
  resignGame,
  syncClocksInPlace,
} from '../../shared/engine';
import { chooseBotAction } from '../../shared/bot';
import { DuckhouseRealtimeClient } from '../services/realtime';
import {
  playCaptureSound,
  playDropSound,
  playDuckSound,
  playMoveSound,
  playWinSound,
  setSoundMuted,
} from '../utils/sounds';

export type AppPage = 'home' | 'lobby' | 'room' | 'practice';
export type PracticeMode = 'bots' | 'sandbox';

interface GameContextValue {
  page: AppPage;
  setPage: (p: AppPage) => void;

  playerId: string;
  playerName: string;
  setPlayerName: (name: string) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  muted: boolean;
  toggleMute: () => void;
  showRules: boolean;
  setShowRules: (open: boolean) => void;

  connected: boolean;
  publicRooms: PublicRoomSummary[];
  matchmaking: MatchmakingStatus;
  errorBanner: string | null;
  clearError: () => void;
  refreshRooms: () => void;

  room: RoomState | null;
  mySeat: SeatKey | null;
  isHost: boolean;
  createRoom: (opts: { name: string; visibility: RoomVisibility; timeControlId: string }) => Promise<boolean>;
  joinRoom: (code: string) => Promise<boolean>;
  leaveRoom: () => void;
  takeSeat: (seat: SeatKey) => void;
  addBot: (seat?: SeatKey) => void;
  removeBot: (seat: SeatKey) => void;
  startGame: () => Promise<boolean>;
  rematch: () => void;
  sendMove: (input: ChessMoveInput) => void;
  sendDrop: (input: DropMoveInput) => void;
  sendDuck: (input: DuckMoveInput) => void;
  resign: () => void;
  sendChat: (text: string, scope?: 'all' | 'team') => void;
  joinMatchmaking: (timeControlId: string) => void;
  leaveMatchmaking: () => void;

  practiceMode: PracticeMode;
  practiceTc: TimeControl;
  practiceGame: GameState;
  startPractice: (mode: PracticeMode, tc?: TimeControl) => void;
  practiceMove: (input: ChessMoveInput) => void;
  practiceDrop: (input: DropMoveInput) => void;
  practiceDuck: (input: DuckMoveInput) => void;
  practiceResign: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

function getOrCreatePlayerId(): string {
  const saved = localStorage.getItem('duckhouse_player_id');
  if (saved) return saved;
  const fresh = `p_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  localStorage.setItem('duckhouse_player_id', fresh);
  return fresh;
}

function getOrCreatePlayerName(): string {
  const saved = localStorage.getItem('duckhouse_player_name');
  if (saved) return saved;
  const animals = ['Mallard', 'Drake', 'Teal', 'Pintail', 'Canvasback', 'WoodDuck', 'Wigeon'];
  const name = `${animals[Math.floor(Math.random() * animals.length)]}${Math.floor(10 + Math.random() * 89)}`;
  localStorage.setItem('duckhouse_player_name', name);
  return name;
}

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [playerId] = useState<string>(() => getOrCreatePlayerId());
  const [playerName, setPlayerNameState] = useState<string>(() => getOrCreatePlayerName());
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('duckhouse_theme') as 'dark' | 'light') || 'dark';
  });
  const [muted, setMuted] = useState<boolean>(() => localStorage.getItem('duckhouse_muted') === 'true');
  const [showRules, setShowRules] = useState(false);

  const [page, setPageState] = useState<AppPage>('home');
  const [connected, setConnected] = useState(false);
  const [publicRooms, setPublicRooms] = useState<PublicRoomSummary[]>([]);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [matchmaking, setMatchmaking] = useState<MatchmakingStatus>({
    inQueue: false,
    timeControlId: null,
    queueCount: 0,
    needed: 4,
    queueCountsByTc: {},
    onlineCount: 1,
  });

  const [practiceMode, setPracticeMode] = useState<PracticeMode>('bots');
  const [practiceTc, setPracticeTc] = useState<TimeControl>(TIME_CONTROLS[2]);
  const [practiceGame, setPracticeGame] = useState<GameState>(() =>
    createInitialGame(TIME_CONTROLS[2], 'playing')
  );

  const clientRef = useRef<DuckhouseRealtimeClient | null>(null);
  const prevRoomRef = useRef<RoomState | null>(null);
  const pendingJoinCodeRef = useRef<string | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('duckhouse_theme', theme);
  }, [theme]);

  useEffect(() => {
    setSoundMuted(muted);
    localStorage.setItem('duckhouse_muted', String(muted));
  }, [muted]);

  const setPage = useCallback((nextPage: AppPage) => {
    setPageState(nextPage);
    if (nextPage === 'home') window.location.hash = '#/';
    else if (nextPage === 'lobby') window.location.hash = '#/lobby';
    else if (nextPage === 'practice') window.location.hash = '#/practice';
  }, []);

  const connectAndEnterRoom = useCallback(async (code: string): Promise<boolean> => {
    const client = clientRef.current;
    if (!client) return false;
    const res = await client.connectRoom(code);
    if (!res.ok) {
      setErrorBanner(res.error || 'Room not found.');
      setPageState('lobby');
      return false;
    }
    const upper = code.trim().toUpperCase();
    setPageState('room');
    if (window.location.hash !== `#/room/${upper}`) {
      window.location.hash = `#/room/${upper}`;
    }
    return true;
  }, []);

  // Initialize Cloudflare Durable Objects WebSocket client
  useEffect(() => {
    const client = new DuckhouseRealtimeClient(playerId, playerName, {
      onLobbyConnectionChange: (isConn) => {
        setConnected(isConn);
        if (isConn && pendingJoinCodeRef.current) {
          const code = pendingJoinCodeRef.current;
          pendingJoinCodeRef.current = null;
          void client.connectRoom(code).then((res) => {
            if (!res.ok) {
              setErrorBanner(res.error || 'Room not found.');
              setPageState('lobby');
            } else {
              setPageState('room');
            }
          });
        }
      },
      onLobbyMessage: (msg) => {
        if (msg.type === 'lobby:rooms') {
          setPublicRooms(msg.rooms);
        } else if (msg.type === 'matchmaking:status') {
          setMatchmaking(msg.status);
        } else if (msg.type === 'matchmaking:matched') {
          prevRoomRef.current = msg.room;
          setRoom(msg.room);
          setPageState('room');
          window.location.hash = `#/room/${msg.code}`;
          playWinSound();
          void client.connectRoom(msg.code);
        }
      },
      onRoomMessage: (msg) => {
        if (msg.type === 'room:state') {
          const nextRoom = msg.room;
          const prev = prevRoomRef.current;
          if (prev && prev.code === nextRoom.code) {
            if (prev.game.status !== 'finished' && nextRoom.game.status === 'finished') {
              playWinSound();
            } else {
              for (const bId of ['A', 'B'] as BoardId[]) {
                const pb = prev.game.boards[bId];
                const nb = nextRoom.game.boards[bId];
                if (nb.moveHistory.length > pb.moveHistory.length) {
                  const last = nb.moveHistory[nb.moveHistory.length - 1];
                  if (last.kind === 'drop') playDropSound();
                  else if (last.capturedType) playCaptureSound();
                  else playMoveSound();
                } else if (nb.duckSquare !== pb.duckSquare && nb.duckSquare !== null) {
                  playDuckSound();
                }
              }
            }
          }
          prevRoomRef.current = nextRoom;
          setRoom(nextRoom);
          setPageState('room');
          if (window.location.hash !== `#/room/${nextRoom.code}`) {
            window.location.hash = `#/room/${nextRoom.code}`;
          }
        } else if (msg.type === 'game:clocks') {
          setRoom((curr) =>
            curr
              ? {
                  ...curr,
                  game: {
                    ...curr.game,
                    clocks: msg.clocks,
                    lastClockTickAt: msg.lastClockTickAt,
                  },
                }
              : curr
          );
        }
      },
      onRoomError: (err) => {
        setErrorBanner(err);
        setRoom(null);
        prevRoomRef.current = null;
        setPageState('lobby');
        window.location.hash = '#/lobby';
      },
    });

    clientRef.current = client;
    client.connectLobby();

    return () => {
      client.destroy();
      clientRef.current = null;
    };
  }, [playerId]);

  // Parse hash route for invite links (#/room/CODE)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash || '#/';
      const roomMatch = hash.match(/^#\/room\/([A-Za-z0-9]{4,10})$/);
      if (roomMatch) {
        const code = roomMatch[1].toUpperCase();
        if (prevRoomRef.current?.code === code) {
          setPageState('room');
          return;
        }
        if (clientRef.current?.isLobbyConnected()) {
          void connectAndEnterRoom(code);
        } else {
          pendingJoinCodeRef.current = code;
        }
      } else if (hash === '#/lobby') {
        setPageState('lobby');
      } else if (hash === '#/practice') {
        setPageState('practice');
      } else if (hash === '#/' || hash === '') {
        setPageState('home');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [connectAndEnterRoom]);

  const setPlayerName = useCallback((name: string) => {
    const clean = name.trim().slice(0, 20) || 'Player';
    setPlayerNameState(clean);
    localStorage.setItem('duckhouse_player_name', clean);
    clientRef.current?.setPlayerName(clean);
  }, []);

  const mySeat = useMemo<SeatKey | null>(() => {
    if (!room) return null;
    for (const seat of ALL_SEATS) {
      if (room.seats[seat]?.id === playerId) return seat;
    }
    return null;
  }, [room, playerId]);

  const isHost = useMemo(() => Boolean(room && room.hostId === playerId), [room, playerId]);

  const refreshRooms = useCallback(() => {
    void clientRef.current
      ?.requestLobby<{ ok: boolean; rooms?: PublicRoomSummary[] }>({ type: 'lobby:list' })
      .then((res) => {
        if (res?.ok && Array.isArray(res.rooms)) setPublicRooms(res.rooms);
      });
  }, []);

  const createRoom = useCallback(
    async (opts: { name: string; visibility: RoomVisibility; timeControlId: string }) => {
      const client = clientRef.current;
      if (!client?.isLobbyConnected()) {
        setErrorBanner('Multiplayer server is offline. Start it with `npm run dev` or try Practice Mode!');
        return false;
      }
      const res = await client.requestLobby<{ ok: boolean; room?: RoomState; error?: string }>({
        type: 'room:create',
        name: opts.name,
        visibility: opts.visibility,
        timeControlId: opts.timeControlId,
      });
      if (!res?.ok || !res.room) {
        setErrorBanner(res?.error || 'Could not create room.');
        return false;
      }
      prevRoomRef.current = res.room;
      setRoom(res.room);
      return connectAndEnterRoom(res.room.code);
    },
    [connectAndEnterRoom]
  );

  const joinRoom = useCallback(
    async (code: string) => {
      if (!clientRef.current?.isLobbyConnected()) {
        setErrorBanner('Multiplayer server is offline. Start it with `npm run dev` or try Practice Mode!');
        return false;
      }
      return connectAndEnterRoom(code);
    },
    [connectAndEnterRoom]
  );

  const leaveRoom = useCallback(() => {
    clientRef.current?.disconnectRoom(true);
    setRoom(null);
    prevRoomRef.current = null;
    setPage('lobby');
  }, [setPage]);

  const takeSeat = useCallback((seat: SeatKey) => {
    clientRef.current?.sendRoom({ type: 'room:takeSeat', seat });
  }, []);

  const addBot = useCallback((seat?: SeatKey) => {
    clientRef.current?.sendRoom({ type: 'room:addBot', seat });
  }, []);

  const removeBot = useCallback((seat: SeatKey) => {
    clientRef.current?.sendRoom({ type: 'room:removeBot', seat });
  }, []);

  const startGame = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return false;
    const res = await client.requestRoom<{ ok: boolean; error?: string }>({ type: 'room:start' });
    if (res?.ok) return true;
    setErrorBanner(res?.error || 'Unable to start game.');
    return false;
  }, []);

  const rematch = useCallback(() => {
    clientRef.current?.sendRoom({ type: 'room:rematch' });
  }, []);

  const sendMove = useCallback((input: ChessMoveInput) => {
    void clientRef.current
      ?.requestRoom<{ ok: boolean; error?: string }>({ type: 'game:move', ...input })
      .then((res) => {
        if (res && !res.ok && res.error) setErrorBanner(res.error);
      });
  }, []);

  const sendDrop = useCallback((input: DropMoveInput) => {
    void clientRef.current
      ?.requestRoom<{ ok: boolean; error?: string }>({ type: 'game:drop', ...input })
      .then((res) => {
        if (res && !res.ok && res.error) setErrorBanner(res.error);
      });
  }, []);

  const sendDuck = useCallback((input: DuckMoveInput) => {
    void clientRef.current
      ?.requestRoom<{ ok: boolean; error?: string }>({ type: 'game:duck', ...input })
      .then((res) => {
        if (res && !res.ok && res.error) setErrorBanner(res.error);
      });
  }, []);

  const resign = useCallback(() => {
    clientRef.current?.sendRoom({ type: 'game:resign' });
  }, []);

  const sendChat = useCallback((text: string, scope: 'all' | 'team' = 'all') => {
    clientRef.current?.sendRoom({ type: 'room:chat', text, scope });
  }, []);

  const joinMatchmaking = useCallback((timeControlId: string) => {
    if (!clientRef.current?.isLobbyConnected()) {
      setErrorBanner('Multiplayer server is offline. Run `npm run dev` to connect!');
      return;
    }
    clientRef.current.sendLobby({ type: 'matchmaking:join', timeControlId });
  }, []);

  const leaveMatchmaking = useCallback(() => {
    clientRef.current?.sendLobby({ type: 'matchmaking:leave' });
  }, []);

  // --- Local Practice / Offline Sandbox ---

  const startPractice = useCallback(
    (mode: PracticeMode, tc: TimeControl = practiceTc) => {
      setPracticeMode(mode);
      setPracticeTc(tc);
      setPracticeGame(createInitialGame(tc, 'playing'));
      setPage('practice');
    },
    [practiceTc, setPage]
  );

  const practiceMove = useCallback((input: ChessMoveInput) => {
    setPracticeGame((curr) => {
      const res = applyChessMove(curr, input.boardId, input.from, input.to, input.promotion);
      if (!res.ok) return curr;
      if (res.kingCaptured) playWinSound();
      else if (res.captured) playCaptureSound();
      else playMoveSound();
      return res.state;
    });
  }, []);

  const practiceDrop = useCallback((input: DropMoveInput) => {
    setPracticeGame((curr) => {
      const res = applyDropMove(curr, input.boardId, input.pieceType, input.to);
      if (!res.ok) return curr;
      playDropSound();
      return res.state;
    });
  }, []);

  const practiceDuck = useCallback(
    (input: DuckMoveInput) => {
      setPracticeGame((curr) => {
        const res = applyDuckMove(curr, input.boardId, input.to, practiceTc.incrementMs);
        if (!res.ok) return curr;
        playDuckSound();
        return res.state;
      });
    },
    [practiceTc.incrementMs]
  );

  const practiceResign = useCallback(() => {
    setPracticeGame((curr) => {
      playWinSound();
      return resignGame(curr, 1, 'A');
    });
  }, []);

  useEffect(() => {
    if (page !== 'practice' || practiceGame.status !== 'playing') return;
    const id = setInterval(() => {
      setPracticeGame((curr) => {
        if (curr.status !== 'playing') return curr;
        const next = structuredClone(curr);
        const flagged = syncClocksInPlace(next, Date.now());
        if (flagged) playWinSound();
        return next;
      });
    }, 250);
    return () => clearInterval(id);
  }, [page, practiceGame.status]);

  useEffect(() => {
    if (page !== 'practice' || practiceMode !== 'bots' || practiceGame.status !== 'playing') return;
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const boardId of ['A', 'B'] as BoardId[]) {
      const board = practiceGame.boards[boardId];
      const activeSeat = getSeatKey(boardId, board.turn);
      if (activeSeat === 'A_w') continue;

      const delay = board.phase === 'chess' ? 620 + Math.random() * 480 : 380 + Math.random() * 280;
      const t = setTimeout(() => {
        setPracticeGame((curr) => {
          if (curr.status !== 'playing') return curr;
          const b = curr.boards[boardId];
          if (getSeatKey(boardId, b.turn) === 'A_w') return curr;
          const action = chooseBotAction(curr, boardId);
          if (!action) return curr;

          if (action.kind === 'move') {
            const res = applyChessMove(curr, boardId, action.from, action.to, action.promotion);
            if (res.ok) {
              if (res.kingCaptured) playWinSound();
              else if (res.captured) playCaptureSound();
              else playMoveSound();
              return res.state;
            }
          } else if (action.kind === 'drop') {
            const res = applyDropMove(curr, boardId, action.pieceType, action.to);
            if (res.ok) {
              playDropSound();
              return res.state;
            }
          } else {
            const res = applyDuckMove(curr, boardId, action.to, practiceTc.incrementMs);
            if (res.ok) {
              playDuckSound();
              return res.state;
            }
          }
          return curr;
        });
      }, delay);
      timers.push(t);
    }

    return () => timers.forEach(clearTimeout);
  }, [
    page,
    practiceMode,
    practiceGame.status,
    practiceGame.boards.A.turn,
    practiceGame.boards.A.phase,
    practiceGame.boards.B.turn,
    practiceGame.boards.B.phase,
    practiceTc.incrementMs,
  ]);

  const value: GameContextValue = {
    page,
    setPage,
    playerId,
    playerName,
    setPlayerName,
    theme,
    toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    muted,
    toggleMute: () => setMuted((m) => !m),
    showRules,
    setShowRules,
    connected,
    publicRooms,
    matchmaking,
    errorBanner,
    clearError: () => setErrorBanner(null),
    refreshRooms,
    room,
    mySeat,
    isHost,
    createRoom,
    joinRoom,
    leaveRoom,
    takeSeat,
    addBot,
    removeBot,
    startGame,
    rematch,
    sendMove,
    sendDrop,
    sendDuck,
    resign,
    sendChat,
    joinMatchmaking,
    leaveMatchmaking,
    practiceMode,
    practiceTc,
    practiceGame,
    startPractice,
    practiceMove,
    practiceDrop,
    practiceDuck,
    practiceResign,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}

export function getSeatLabel(seat: SeatKey): string {
  switch (seat) {
    case 'A_w':
      return 'Board A · White';
    case 'A_b':
      return 'Board A · Black';
    case 'B_w':
      return 'Board B · White';
    case 'B_b':
      return 'Board B · Black';
  }
}

export function getTeamColorName(seat: SeatKey): string {
  return getSeatTeam(seat) === 1 ? 'Team Emerald' : 'Team Amber';
}
