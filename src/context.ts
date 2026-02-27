import { connect, migreate } from './db';
import { createLogger } from './logger';
import { loadConfig } from './config';
import { createFs } from './fs';

/**
 * @public Initializes the full context of dependencies needed by most
 *         pg commands.
 * @since  18.0.0
 */
export const createContext = async (env: Bun.Env) => {
  const config = await loadConfig(env);

  const log = createLogger({
    level: config.PG_LOG_LEVEL,
    silent: config.PG_SILENCED_LOGS,
  });

  const db = await connect(config);
  await migreate(db, log);

  if (config.PG_READONLY_MODE) {
    log.warning('Running in read-only mode, write operations will error');
  }

  const fs = createFs(config);

  const ac = new AbortController();
  const signal = ac.signal;
  const abort = ac.abort.bind(ac);

  process.on('SIGINT', () => ac.abort())
         .on('SIGTERM', () => ac.abort())
         .on('SIGKILL', () => ac.abort());

  return { abort, config, db, fs, log, signal };
};

/**
 * @public  The shape of the context object.
 * @since   18.0.0
 * @version 1
 */
export type Context = Awaited<ReturnType<typeof createContext>>;
