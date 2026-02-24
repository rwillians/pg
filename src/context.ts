import { createLogger } from './logger';
import { parseConfig } from './config';
import { connect, setup } from './db';
import { createFs } from './fs';

export const createContext = async (env: Bun.Env) => {
  const config = parseConfig(env);

  const logger = createLogger({
    level: config.PG_LOG_LEVEL,
    silent: config.PG_SILENT,
  });

  const db = connect(config, logger);
  await setup(db, logger);

  const fs = createFs(config);

  return { config, db, fs, logger };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
