import { connect, migrate } from './db';
import { createLogger } from './logger';
import { type StringLike } from 'bun';
import { loadConfig } from './config';
import { createFs } from './fs';

/**
 * @public Initializes the full context of dependencies needed by most
 *         pg commands.
 * @since  18.0.0
 */
export const createContext = async (env: Bun.Env) => {
  const pid = process.pid;

  const config = await loadConfig(env);
  const log = await createLogger({ pid, level: config.PG_LOG_LEVEL, silent: config.PG_SILENCED_LOGS });
  const fs = await createFs(config);

  const db = await connect(config);
  await migrate(db, log);

  const ac = new AbortController();
  const signal = ac.signal;

  /**
   * @public Aborts the context signal.
   * @since  18.0.0
   */
  const abort = ac.abort.bind(ac);

  /**
   * @public Same as {@link abort} but logs the given error before
   *         aborting the signal.
   * @since  18.0.0
   */
  const halt = (error?: Error | StringLike) => {
    if (error) log.error(error);
    abort();
  };

  process.on('SIGINT', halt)
         .on('SIGTERM', halt)
         .on('SIGKILL', halt);

  if (config.PG_READONLY_MODE) {
    log.warning('Running in read-only mode, write operations will fail');
  }

  return { abort, config, db, fs, halt, log, pid, signal };
};

/**
 * @public  The shape of the context object.
 * @since   18.0.0
 * @version 1
 */
export type Context = Awaited<ReturnType<typeof createContext>>;
