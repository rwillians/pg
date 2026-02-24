import { join } from 'node:path';
import { type BunFile as LocalFile, CryptoHasher, S3Client } from 'bun';

import type { Config } from './config';

/**
 * Resolves the path prefix in S3 for the given database slug and
 * purpose-specific directory path.
 */
const resolve = (slug: string | undefined, path: string) => slug
  ? join(`/databases/${slug}`, `.${path}`)
  : path;

/**
 * Calculates the MD5 hash of the given data.
 */
const md5sum = async (data: Uint8Array<ArrayBuffer>) => new CryptoHasher('md5').update(data).digest('hex');

export const createFs = (config: Config) => {
  const S3_ARCHIVES_PREFIX = resolve(config.PG_SLUG, config.S3_ARCHIVES_PREFIX);
  const S3_BACKUPS_PREFIX = resolve(config.PG_SLUG, config.S3_BACKUPS_PREFIX);
  const S3_DUMPS_PREFIX = resolve(config.PG_SLUG, config.S3_DUMPS_PREFIX);
  const S3_CERTS_PREFIX = resolve(config.PG_SLUG, config.S3_CERTS_PREFIX);

  const s3 = new S3Client({
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION,
    bucket: config.S3_BUCKET,
    accessKeyId: config.S3_ACCESS_KEY_ID,
    secretAccessKey: config.S3_SECRET_ACCESS_KEY,
  });

  return {
    local: {
      file: (path: string) => Bun.file(join(config.PG_STATE_DIR, path)),
      md5: async (file: LocalFile) => await file.exists()
        ? md5sum(await file.bytes())
        : null,
    },
    s3: {
      archives: {
        file: (name: string) => s3.file(join(S3_ARCHIVES_PREFIX, name)),
      },
      backups: {
        file: (name: string) => s3.file(join(S3_BACKUPS_PREFIX, name)),
      },
      dumps: {
        file: (name: string) => s3.file(join(S3_DUMPS_PREFIX, name)),
      },
      certs: {
        file: (name: string) => s3.file(join(S3_CERTS_PREFIX, name)),
      },
    },
  }
};
