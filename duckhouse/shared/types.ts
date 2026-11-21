export type Color = 'w' | 'b';
export type BoardId = 'A' | 'B';
export type TeamId = 1 | 2;
export type SeatKey = 'A_w' | 'A_b' | 'B_w' | 'B_b';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type DroppablePieceType = 'p' | 'n' | 'b' | 'r' | 'q';
export type PromotionPieceType = 'q' | 'r' | 'b' | 'n';
export type TurnPhase = 'chess' | 'duck';

export interface Piece {
  type: PieceType;
  color: Color;
  promoted?: boolean;
}

export type PocketCounts = Record<DroppablePieceType, number>;

export interface CastlingRights {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
}

export interface MoveRecord {
  ply: number;
  color: Color;
  kind: 'move' | 'drop';
  from: number | 'drop';
  to: number;
  pieceType: PieceType;
  capturedType?: PieceType;
  promotion?: PromotionPieceType;
  duckTo?: number;
  notation: string;
}

export interface BoardState {
  id: BoardId;
  squares: (Piece | null)[];
  duckSquare: number | null;
  turn: Color;
  phase: TurnPhase;
  castling: CastlingRights;
  enPassant: number | null;
  pockets: Record<Color, PocketCounts>;
  lastMove: {
    from: number | 'drop';
    to: number;
    pieceType: PieceType;
    color: Color;
    captured?: PieceType;
  } | null;
  lastDuckMove: {
    from: number | null;
    to: number;
  } | null;
  moveHistory: MoveRecord[];
}

export interface TimeControl {
  id: string;
  label: string;
  initialMs: number;
  incrementMs: number;
}

export const TIME_CONTROLS: TimeControl[] = [
  { id: '3+0', label: '3 min Blitz', initialMs: 3 * 60_000, incrementMs: 0 },
  { id: '3+2', label: '3+2 Blitz', initialMs: 3 * 60_000, incrementMs: 2_000 },
  { id: '5+0', label: '5 min Rapid', initialMs: 5 * 60_000, incrementMs: 0 },
  { id: '5+3', label: '5+3 Rapid', initialMs: 5 * 60_000, incrementMs: 3_000 },
  { id: '10+0', label: '10 min Classical', initialMs: 10 * 60_000, incrementMs: 0 },
];

export type Clocks = Record<SeatKey, number>;
export type WinReason = 'king_capture' | 'timeout' | 'resignation' | 'abandoned';

export interface GameState {
  boards: Record<BoardId, BoardState>;
  clocks: Clocks;
  status: 'waiting' | 'playing' | 'finished';
  winnerTeam: TeamId | null;
  winReason: WinReason | null;
  winningBoard: BoardId | null;
  startedAt: number | null;
  lastClockTickAt: number | null;
}

export interface SeatPlayer {
  id: string;
  name: string;
  isBot: boolean;
  connected: boolean;
  ready: boolean;
}

export type RoomVisibility = 'public' | 'private';

export interface RoomChatMessage {
  id: string;
  senderName: string;
  seat: SeatKey | 'spectator' | 'system';
  team: TeamId | null;
  text: string;
  scope: 'all' | 'team';
  timestamp: number;
}

export interface RoomState {
  code: string;
  name: string;
  visibility: RoomVisibility;
  hostId: string;
  timeControl: TimeControl;
  seats: Record<SeatKey, SeatPlayer | null>;
  spectators: { id: string; name: string }[];
  game: GameState;
  chat: RoomChatMessage[];
  createdAt: number;
}

export interface PublicRoomSummary {
  code: string;
  name: string;
  hostName: string;
  timeControl: TimeControl;
  status: 'waiting' | 'playing' | 'finished';
  humanCount: number;
  botCount: number;
  openSeats: number;
  createdAt: number;
}

export interface MatchmakingStatus {
  inQueue: boolean;
  timeControlId: string | null;
  queueCount: number;
  needed: number;
  queueCountsByTc: Record<string, number>;
  onlineCount: number;
}

export interface ChessMoveInput {
  boardId: BoardId;
  from: number;
  to: number;
  promotion?: PromotionPieceType;
}

export interface DropMoveInput {
  boardId: BoardId;
  pieceType: DroppablePieceType;
  to: number;
}

export interface DuckMoveInput {
  boardId: BoardId;
  to: number;
}

export const ALL_SEATS: SeatKey[] = ['A_w', 'B_b', 'A_b', 'B_w'];

export function getSeatTeam(seat: SeatKey): TeamId {
  return seat === 'A_w' || seat === 'B_b' ? 1 : 2;
}

export function getSeatBoardAndColor(seat: SeatKey): { boardId: BoardId; color: Color } {
  const [boardId, color] = seat.split('_') as [BoardId, Color];
  return { boardId, color };
}

export function getPartnerSeat(seat: SeatKey): SeatKey {
  switch (seat) {
    case 'A_w':
      return 'B_b';
    case 'B_b':
      return 'A_w';
    case 'A_b':
      return 'B_w';
    case 'B_w':
      return 'A_b';
  }
}

export function getSeatKey(boardId: BoardId, color: Color): SeatKey {
  return `${boardId}_${color}` as SeatKey;
}

export function oppositeColor(color: Color): Color {
  return color === 'w' ? 'b' : 'w';
}

export function otherBoard(boardId: BoardId): BoardId {
  return boardId === 'A' ? 'B' : 'A';
}
