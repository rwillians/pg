import { $ } from 'bun';
import type { Context } from './context';
import type { Logger } from './logger';

const hasFlag = (req: Request, flag: string) => new URL(req.url).searchParams.has(flag);

const response = async (logger: Logger, prom: Promise<any>) => prom
  .then(() => new Response('', { status: 204 }))
  .catch((err) => { logger.error(err); return new Response(err.stack, { status: 500 }) });

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
      '/api/webhooks/backup-new': {
        POST: async (req) => {
          logger.info('POST /api/webhooks/backup-new');

          return hasFlag(req, 'incremental')
            ? response(logger, $`pg backup new -i`)
            : response(logger, $`pg backup new`);
        },
      },
      '/api/webhooks/dump-new': {
        POST: async () => {
          logger.info('POST /api/webhooks/dump-new');
          return response(logger, $`pg dump new`);
        },
      },
    },
    fetch: async () => new Response('', { status: 204 }),
  });

  logger.info(`API server listening on http://0.0.0.0:${config.PG_API_PORT}`);
  signal.addEventListener('abort', () => api.stop());

  return api;
};
