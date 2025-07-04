import { $ } from 'bun';
import type { Context } from './context';
import type { Logger } from './logger';

const response = async (logger: Logger, prom: Promise<any>) => prom
  .then(() => new Response('', { status: 204 }))
  .catch((err) => { logger.error(err); return new Response(err.stack, { status: 500 }) })

export const createApi = async (ctx: Context, signal: AbortSignal) => {
  const { config, logger } = ctx;

  const api = Bun.serve({
    idleTimeout: 0, // ← no timeout
    hostname: '0.0.0.0',
    port: config.PG_API_PORT,
    routes: {
      '/api': {
        GET: async () => new Response('', { status: 204 }),
      },
      '/api/triggers/create-backup': {
        POST: async () => {
          logger.info('POST /api/triggers/create-backup');
          return response(logger, $`pg backup:create`);
        },
      },
      '/api/triggers/create-incremental-backup': {
        POST: async () => {
          logger.info('POST /api/triggers/create-incremental-backup');
          return response(logger, $`pg backup:create -i`);
        },
      },
      '/api/triggers/create-dump': {
        POST: async () => {
          logger.info('POST /api/triggers/create-dump');
          return response(logger, $`pg dump:create`);
        },
      },
    },
    fetch: async () => new Response('', { status: 204 }),
  });

  logger.info(`API server listening on http://0.0.0.0:${config.PG_API_PORT}`);
  signal.addEventListener('abort', () => api.stop());

  return api;
};
