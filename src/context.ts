import { S3Client } from 'bun';
import { createLogger } from './logger';
import { parseConfig } from './config';

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

  return {
    config,
    logger,
    s3,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
