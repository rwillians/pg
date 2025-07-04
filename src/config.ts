import { t, s, z } from './utils';

/**
 * @private
 */
const NODE_ENV = process.env.NODE_ENV || 'dev';

/**
 * @private
 */
const ConfigSchema = z.object({
  /**
   * PostgreSQL settings
   */
  POSTGRES_USER: z.literal('postgres').default('postgres'),
  //                           ↑
  //    username MUST be postgres so that we can automatically
  //     authenticate against the socket with the OS user for
  //        commands like backup:restore and dump:restore
  POSTGRES_PASSWORD: t.secret(),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_DATA_DIR: t.absolutePath().default('/var/lib/postgresql/data'),
  POSTGRES_MAX_CONNECTIONS: z.coerce.number().int().min(1).default(100),
  POSTGRES_SHARED_BUFFERS: z.string().default('128MB'),
  POSTGRES_MAX_WAL_SIZE: z.enum(['16MB', '32MB', '64MB', '128MB', '256MB', '512MB', '1GB']).default('32MB'),

  /**
   * S3-compatible storage credentials
   */
  S3_ENDPOINT: z.url(),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: t.secret(),
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().min(1).optional(),

  /**
   * SSL settings
   */
  SSL_SUBJECT_EXPIRY_DAYS: z.coerce.number().int().min(90).max(365).default(365),
  SSL_SUBJECT_COUNTRY: z.string().default(''),
  SSL_SUBJECT_STATE: z.string().default(''),
  SSL_SUBJECT_LOCALITY: z.string().default(''),
  SSL_SUBJECT_ORGANIZATION: z.string().default(''),
  SSL_SUBJECT_ORGANIZATIONAL_UNIT: z.string().default(''),
  SSL_SUBJECT_COMMON_NAME: z.string().default(''),
  SSL_SUBJECT_EMAIL: z.email().default(''),

  /**
   * pg settings
   */
  PG_LOG_LEVEL: z.enum(['debug', 'info', 'notice', 'warning', 'error']).default('info'),
  PG_SILENT: z.coerce.boolean().default(NODE_ENV === 'test'),
  PG_API_PORT: z.coerce.number().int().min(80).max(65535).default(3456),
  PG_WAL_ARCHIVE_DIR: t.absolutePath().default('/wal-archive'),
  PG_BACKUPS_DIR: t.absolutePath().default('/backups'),
  PG_DUMPS_DIR: t.absolutePath().default('/dumps'),
  PG_CERTS_DIR: t.absolutePath().default('/certs'),
});

export type Config = z.infer<typeof ConfigSchema>;

const pretty = (error: z.ZodError) => {
  const header = 'One or more environment variables are either missing or invalid:';

  const issues = error
    .issues
    .filter(({ message }) => (message ?? '').trim() !== '')
    .map(({ path, message }) => `  - ${s.red(path.join('.'))}: ${message}`)
    .join('\n');

  return `${header}\n${issues}\n`;
};

export const parseConfig = (env: Bun.Env): Config => {
  try {
    return ConfigSchema.parse(env);
  } catch (error) {
    if (!(error instanceof z.ZodError)) throw error;
    process.stderr.write(pretty(error));
    process.exit(1);
  }
};
