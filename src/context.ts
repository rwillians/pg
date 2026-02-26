import { ConfigError, loadConfig } from './config';
import { connect, migreate } from './db';
import { createLogger } from './logger';
import { p, proc } from './utils';
import { createFs } from './fs';
import { S3Client } from 'bun';

/**
 * @public  Initializes the full context needed for most pg commands.
 * @since   18.0.0
 * @version 1
 */
export const createContext = async (env: Bun.Env) => {
  const config = await loadConfig(env).catch(p.rescue(ConfigError, proc.halt(1)));

  const log = createLogger({
    level: config.PG_LOG_LEVEL,
    silent: config.PG_SILENCED_LOGS,
  });

  const db = await connect(config, log);
  await migreate(db, log);

  const s3 = new S3Client({
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION,
    bucket: config.S3_BUCKET,
    accessKeyId: config.S3_ACCESS_KEY_ID,
    secretAccessKey: config.S3_SECRET_ACCESS_KEY,
  });

  const fs = createFs(config, s3);

  const ac = new AbortController();
  const signal = ac.signal;
  const halt = (reason?: string | number) => { ac.abort(reason); }

  process.on('SIGINT', () => ac.abort())
         .on('SIGTERM', () => ac.abort())
         .on('SIGKILL', () => ac.abort());

  return { config, db, fs, halt, log, signal };
};

/**
 * @public  The shape of the context object.
 * @since   18.0.0
 * @version 1
 */
export type Context = Awaited<ReturnType<typeof createContext>>;
