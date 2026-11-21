import { bindings, defineConfig, exports } from 'cf/config';
import * as entrypoint from './worker/index.ts' with { type: 'cf-worker' };

export default defineConfig({
  accountId: '2a17113e446227ba41f65e35e4669266',
  worker: {
    name: 'duckhouse-api',
    entrypoint,
    compatibilityDate: '2026-11-19',
    workersDev: true,
    assets: {
      notFoundHandling: 'single-page-application',
      runWorkerFirst: ['/api/*', '/ws/*'],
    },
    observability: {
      enabled: true,
      traces: {
        enabled: true,
      },
    },
    exports: {
      LobbyDO: exports.durableObject({ storage: 'sqlite' }),
      RoomDO: exports.durableObject({ storage: 'sqlite' }),
    },
    env: {
      LOBBY: bindings.durableObject({
        worker: 'duckhouse-api',
        exportName: 'LobbyDO',
      }),
      ROOMS: bindings.durableObject({
        worker: 'duckhouse-api',
        exportName: 'RoomDO',
      }),
    },
  },
});
