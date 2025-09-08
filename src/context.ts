import { S3Client } from 'bun';
import { createLogger } from './logger';
import { parseConfig } from './config';
import { connect, setup } from './db-v2';

import { archives } from './db-v2/archives';
import { backups } from './db-v2/backups';
import { certs } from './db-v2/certs';
import { dumps } from './db-v2/dumps';

export const createContext = async (env: Bun.Env) => {
  const config = parseConfig(env);

  const logger = createLogger({
    level: config.PG_LOG_LEVEL,
    silent: config.PG_SILENT,
  });

  const s3 = new S3Client({
    endpoint: config.S3_ENDPOINT,
    accessKeyId: config.S3_ACCESS_KEY_ID,
    secretAccessKey: config.S3_SECRET_ACCESS_KEY,
    region: config.S3_REGION,
  });

  const db = await connect(`${config.PG_STATE_DIR}/db-v2.sqlite`);
  await setup(db, [archives, backups, certs, dumps]);

  return {
    config,
    db,
    logger,
    s3,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
