import type { LobbyDO } from './lobbyDO.js';
import type { RoomDO } from './roomDO.js';

export interface Env {
  LOBBY: DurableObjectNamespace<LobbyDO>;
  ROOMS: DurableObjectNamespace<RoomDO>;
  CORS_ORIGIN?: string;
}
