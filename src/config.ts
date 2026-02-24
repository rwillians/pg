import { z } from 'zod/v4';
import { style, zc } from './utils';
import { major } from './pkg' with { type: 'macro' };

/**
 * Runtime environment.
 */
const NODE_ENV = process.env.NODE_ENV || 'prod';

const Schema = z.object({
  // // // // // // // // // // // // // // // // // // // // // // //
  // PASS-THROUGH TO POSTGRES CONFIGURATIONS                        //
  // configurations passed through to docker-entrypoint.sh          //
  // // // // // // // // // // // // // // // // // // // // // // //

  /**
   * The username to connect to the database with.
   */
  POSTGRES_USER: zc.objectname().default('postgres'),

  /**
   * @required A strong password to connect to the database with.
   */
  POSTGRES_PASSWORD: zc.secret(),

  /**
   * @required The name of the database to connect to.
   */
  POSTGRES_DB: zc.objectname(),

  // // // // // // // // // // // // // // // // // // // // // // //
  // ASSERT POSTGRES VARIABLES                                      //
  // validates that pg is running on a compatible postgres image    //
  // // // // // // // // // // // // // // // // // // // // // // //

  /**
   * PostgreSQL's major version must match pg's major version.
   */
  PG_MAJOR: z.literal(major()),

  /**
   * Must be the default data directory.
   */
  PGDATA: z.literal(`/var/lib/postgresql/${major()}/data`),

  /**
   * Must be "postgres" OS user.
   */
  USER: z.literal('postgres'),

  // // // // // // // // // // // // // // // // // // // // // // //
  // TLS CERTIFICATE CONFIGURATIONS                                 //
  // // // // // // // // // // // // // // // // // // // // // // //

  TLS_SUBJECT_EXPIRY_DAYS: z.coerce.number().int().min(90).max(365).default(365),
  TLS_SUBJECT_COUNTRY: z.string().default(''),
  TLS_SUBJECT_STATE: z.string().default(''),
  TLS_SUBJECT_LOCALITY: z.string().default(''),
  TLS_SUBJECT_ORGANIZATION: z.string().default(''),
  TLS_SUBJECT_ORGANIZATIONAL_UNIT: z.string().default(''),
  TLS_SUBJECT_COMMON_NAME: z.string().default(''),
  TLS_SUBJECT_EMAIL: z.email().default(''),

  // // // // // // // // // // // // // // // // // // // // // // //
  // S3-COMPATIBLE STORAGE                                          //
  // // // // // // // // // // // // // // // // // // // // // // //

  S3_ENDPOINT: z.url(),
  S3_REGION: zc.nes().optional(),
  S3_BUCKET: zc.bucketname(),
  S3_ACCESS_KEY_ID: zc.nes(),
  S3_SECRET_ACCESS_KEY: zc.nes(),
  S3_ARCHIVES_PREFIX: zc.absolutePath().default('/archives'),
  S3_BACKUPS_PREFIX: zc.absolutePath().default('/backups'),
  S3_DUMPS_PREFIX: zc.absolutePath().default('/dumps'),
  S3_CERTS_PREFIX: zc.absolutePath().default('/certs'),

  // // // // // // // // // // // // // // // // // // // // // // //
  // PG CLI SETTINGS                                                //
  // // // // // // // // // // // // // // // // // // // // // // //

  /**
   * The database instance slug. When present, pg state wil be stored
   * under a directory named after the slug.
   *
   * This allows multiple database instaces to safely share the same
   * S3 bucket by isolating their state in different directories.
   */
  PG_SLUG: zc.slug().optional(),

  /**
   * Controls log verbosity.
   */
  PG_LOG_LEVEL: z.enum(['debug', 'info', 'notice', 'warning', 'error']).default('info'),

  /**
   * Mutes all output except for warnings and errors.
   */
  PG_SILENT: z.coerce.boolean().default(NODE_ENV === 'test'),

  /**
   * Defines the directory where pg stores its state.
   */
  PG_STATE_DIR: zc.absolutePath().default('/var/lib/pg'),

  /**
   * Defines the maximum number of connections allowed.
   */
  POSTGRES_MAX_CONNECTIONS: z
    .coerce
    .number()
    .int()
    .min(10)
    .default(100),

  /**
   * Defines the amount of memory the database can use for shared
   * buffers.
   */
  POSTGRES_SHARED_BUFFERS: zc.memorySize().default('256MB'),

  /**
   * Defines the maximum size to let the write-ahead log grow to
   * between automatic checkpoints.
   *
   * **NOTE:** setting this to a lower value can help reduce recovery
   * time in the event of a crash, but setting it too low can
   * negatively impact performance.
   */
  POSTGRES_MAX_WAL_SIZE: zc.storageSize().default('128MB'),
});

export type Config = z.infer<typeof Schema>;

const prune = (msg: string) => msg.replace(/^Invalid input\: /, '');

const pretty = (error: z.ZodError) => {
  const header = 'One or more environment variables are either missing or invalid:';

  const issues = error
    .issues
    .filter(({ message }) => (message ?? '').trim() !== '')
    .map(({ path, message }) => `  - field ${style.red(path.join('.'))} ${prune(message)}`)
    .join('\n');

  return `${header}\n${issues}\n`;
};

export const parseConfig = (env: Bun.Env): Config => {
  try {
    return Schema.parse(env);
  } catch (error) {
    if (!(error instanceof z.ZodError)) throw error;
    process.stderr.write(pretty(error));
    process.exit(1);
  }
};
