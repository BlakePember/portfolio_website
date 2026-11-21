import {
  BoardId,
  Clocks,
  DroppablePieceType,
  MatchmakingStatus,
  PromotionPieceType,
  PublicRoomSummary,
  RoomState,
  RoomVisibility,
  SeatKey,
} from './types.js';

// Client -> LobbyDO
export type LobbyClientMessage =
  | { type: 'player:identify'; name: string }
  | { type: 'lobby:list'; reqId?: string }
  | {
      type: 'room:create';
      reqId?: string;
      name?: string;
      visibility?: RoomVisibility;
      timeControlId?: string;
    }
  | { type: 'matchmaking:join'; timeControlId: string }
  | { type: 'matchmaking:leave' }
  | { type: 'ping' };

// LobbyDO -> Client
export type LobbyServerMessage =
  | { type: 'lobby:rooms'; rooms: PublicRoomSummary[] }
  | { type: 'matchmaking:status'; status: MatchmakingStatus }
  | { type: 'matchmaking:matched'; code: string; room: RoomState }
  | {
      type: 'ack';
      reqId: string;
      ok: boolean;
      room?: RoomState;
      rooms?: PublicRoomSummary[];
      error?: string;
    }
  | { type: 'pong' };

// Client -> RoomDO
export type RoomClientMessage =
  | { type: 'player:identify'; name: string }
  | { type: 'room:leave' }
  | { type: 'room:takeSeat'; seat: SeatKey }
  | { type: 'room:addBot'; seat?: SeatKey }
  | { type: 'room:removeBot'; seat: SeatKey }
  | { type: 'room:start'; reqId?: string }
  | { type: 'room:rematch' }
  | {
      type: 'game:move';
      reqId?: string;
      boardId: BoardId;
      from: number;
      to: number;
      promotion?: PromotionPieceType;
    }
  | {
      type: 'game:drop';
      reqId?: string;
      boardId: BoardId;
      pieceType: DroppablePieceType;
      to: number;
    }
  | {
      type: 'game:duck';
      reqId?: string;
      boardId: BoardId;
      to: number;
    }
  | { type: 'game:resign' }
  | { type: 'room:chat'; text: string; scope?: 'all' | 'team' }
  | { type: 'ping' };

// RoomDO -> Client
export type RoomServerMessage =
  | { type: 'room:state'; room: RoomState }
  | { type: 'game:clocks'; clocks: Clocks; lastClockTickAt: number | null }
  | { type: 'ack'; reqId: string; ok: boolean; error?: string }
  | { type: 'room:error'; error: string }
  | { type: 'pong' };
