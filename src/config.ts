import { major } from './pkg' with { type: 'macro' };
import { ascii, rescue, zc } from './utils';
import { join } from 'path';
import { z } from 'zod/v4';

const NODE_ENV = process.env.NODE_ENV || 'prod';
const PG_MAJOR = major();
const PG_CLUSTER_SLUG = (process.env as any).PG_CLUSTER_SLUG as string | undefined;

const prefixWith = (prefix: string | undefined) => (value: string) => prefix
  ? join(`/clusters/${prefix}`, value)
  : value;

const Schema = z.object({
  // // // // // // // // // // // // // // // // // // // // // // //
  // DOCKER-ENTRYPOINT ENVIRONMENT VARIABLES                        //
  // // // // // // // // // // // // // // // // // // // // // // //

  /**
   * @required The name of the database to create and connect to.
   * @since    18.0.0
   */
  POSTGRES_DB: zc.dbname(),

  /**
   * @required A strong password to pair with the PostgreSQL's user.
   * @since    18.0.0
   */
  POSTGRES_PASSWORD: zc.secret(),

  /**
   * @required The username to create and connect to the database
   *           with. Cannot be "postgres" for security reasons.
   * @since    18.0.0
   */
  POSTGRES_USER: zc.username(),

  // // // // // // // // // // // // // // // // // // // // // // //
  // PG CLI CONFIGS                                                 //
  // // // // // // // // // // // // // // // // // // // // // // //

  /**
   * @optional A slug that identifies the PostgreSQL cluster. This
   *           MUST be set when multiple clusters share the same
   *           S3 bucket to avoid conflicts.
   * @since    18.0.0
   */
  PG_CLUSTER_SLUG: zc.slug().optional(),

  /**
   * @optional Cron expression for scheduling automatic full
   *           backups. When set, the scheduler will run
   *           `pg backup new` at the specified interval.
   * @since    18.0.0
   */
  PG_CRON_BACKUP: zc.cron().default('0 3 * * 1'),

  /**
   * @optional Cron expression for scheduling automatic
   *           incremental backups. When set, the scheduler
   *           will run `pg backup new -i` at the specified
   *           interval.
   * @since    18.0.0
   */
  PG_CRON_INCREMENTAL_BACKUP: zc.cron().default('0 3 * * 2-7'),

  /**
   * @optional Cron expression for scheduling automatically pushing
   *           pg's state database to S3.
   * @since    18.0.0
   */
  PG_CRON_STATE_PUSH: zc.cron().default('0 * * * *'),

  /**
   * @optional Cron expression for scheduling automatic system-wide
   *           prune.
   * @since    18.0.0
   */
  PG_CRON_SYSTEM_PRUNE: zc.cron().default('0 6 * * 1'),

  /**
   * @optional Controls log verbosity.
   * @since    18.0.0
   */
  PG_LOG_LEVEL: z.enum(['debug', 'info', 'notice', 'warning', 'error']).default('info'),

  /**
   * @optional Retention period in days for which Point-In-Time
   *           Recovery (PITR) should be available.
   * @since    18.0.0
   */
  PG_MAX_PITR_DAYS: z.coerce.number().int().min(1).default(7),

  /**
   * @optional Puts pg in read-only mode, no write operations to
   *           state or S3 are allowed.
   * @since    18.0.0
   * @version  1
   */
  PG_READONLY_MODE: z.coerce.boolean().default(false),

  /**
   * @optional Mutes all logs except for warnings and errors.
   * @since    18.0.0
   */
  PG_SILENCED_LOGS: z.coerce.boolean().default(NODE_ENV === 'test'),

  /**
   * @optional Defines the directory where pg stores its state,
   *           preferably inside a docker volume.
   * @since    18.0.0
   */
  PG_STATE_DIR: zc.absolutePath().default('/var/lib/pg'),

  /**
   * @optional Defines the directory where pg stores temporary files,
   *           such as in-progress database backups and dumps. Don't
   *           use a directory inside a docker volume.
   * @since    18.0.0
   * @version  1
   */
  PG_TEMP_DIR: zc.absolutePath().default('/tmp/pg'),

  // // // // // // // // // // // // // // // // // // // // // // //
  // POSTGRES CONFIGS                                               //
  // // // // // // // // // // // // // // // // // // // // // // //

  /**
   * @optional Specifies the amount of memory the database can use for
   *           maintenance operations, such as VACUUM, CREATE INDEX, etc.
   * @since    18.0.0
   */
  POSTGRES_MAINTENANCE_WORK_MEM: zc.memsize().default('256MB'),

  /**
   * @optional Defines the maximum number of connections allowed.
   * @since    18.0.0
   */
  POSTGRES_MAX_CONNECTIONS: z
    .coerce
    .number()
    .int()
    .min(10, { error: 'must be at least 10 connections' })
    .default(100),

  /**
   * @optional Defines the maximum size that the write-ahead log can
   *           grow to. Once this size is reached, PostgreSQL will
   *           start removing old WAL segments.
   * @since    18.0.0
   */
  POSTGRES_MAX_WAL_SIZE: zc.memsize().default('512MB'),

  /**
   * @optional Specifies the amount of memory the database can use for
   *           shared buffers.
   *
   *           If running in docker, make sure to set `--shm-size` to
   *           at least the value of this config.
   *
   *           e.g.: `docker run --shm-size=256MB rwillians/pg`
   *
   * @since    18.0.0
   */
  POSTGRES_SHARED_BUFFERS: zc.memsize().default('256MB'),

  /**
   * @optional Comma-separated list of shared libraries to be loaded
   *           when starting PostgreSQL's server.
   * @since    18.0.0
   */
  POSTGRES_SHARED_PRELOAD_LIBRARIES: zc
    .nes()
    .regex(/^[a-z][a-z0-9_]+(,[a-z][a-z0-9_]+){0,}$/, { error: 'must be a comma-separated list of shared library names, no spaces' })
    .default('pg_stat_statements'),

  // // // // // // // // // // // // // // // // // // // // // // //
  // S3 CONFIGS                                                     //
  // // // // // // // // // // // // // // // // // // // // // // //

  /**
   * @required The endpoint of the S3 storage service.
   * @since    18.0.0
   */
  S3_ENDPOINT: z.url(),

  /**
   * @optional The region of the S3 storage service.
   * @since    18.0.0
   */
  S3_REGION: zc.nes().optional(),

  /**
   * @required The name of the S3 bucket to use for storing pg state,
   *           archives, backups, dumps, certificates, etc.
   * @since    18.0.0
   */
  S3_BUCKET: zc.bucketname(),

  /**
   * @required The access key ID to connect to the S3 storage.
   * @since    18.0.0
   */
  S3_ACCESS_KEY_ID: zc.nes(),

  /**
   * @required The secret access key to connect to the S3 storage.
   * @since    18.0.0
   */
  S3_SECRET_ACCESS_KEY: zc.nes(),

  /**
   * @optional Prefix directory where to store archived WAL segments.
   * @since    18.0.0
   */
  S3_ARCHIVES_PREFIX: zc
    .absolutePath()
    .default('/archives')
    .transform(prefixWith(PG_CLUSTER_SLUG)),

  /**
   * @optional Prefix directory where to store database backups.
   * @since    18.0.0
   */
  S3_BACKUPS_PREFIX: zc
    .absolutePath()
    .default('/backups')
    .transform(prefixWith(PG_CLUSTER_SLUG)),

  /**
   * @optional Prefix directory where to store pg's state files.
   * @since    18.0.0
   */
  S3_STATE_PREFIX: zc
    .absolutePath()
    .default('/state')
    .transform(prefixWith(PG_CLUSTER_SLUG)),

  // // // // // // // // // // // // // // // // // // // // // // //
  // POSTGRES IMAGE ENVIRONMENT VARIABLES                           //
  // ensures the image matches the version pg was compiled for      //
  // // // // // // // // // // // // // // // // // // // // // // //

  /**
   * @required PostgreSQL's major version.
   * @since    18.0.0
   */
  PG_MAJOR: z.literal(PG_MAJOR, { error: `must be ${PG_MAJOR} because pg was compiled to work with that version specifically` }),

  /**
   * @required PostgreSQL's data directory.
   * @since    18.0.0
   */
  PGDATA: z.literal(`/var/lib/postgresql/${PG_MAJOR}/docker`),
});

const pretty = (error: z.ZodError) => {
  const issues = error
    .issues
    .map(({ path, message }) => [path.join('.'), (message ?? '').trim()] as const)
    .filter(([, message]) => message !== '')
    .sort(([a,], [b,]) => a.localeCompare(b))
    .map(([path, message]) => `- field ${ascii.red(path)} ${message.replace(/^Invalid input\: /, '')}`)
    .join('\n');

  return [
    ascii.bold(ascii.red('ConfigError')),
    ' ',
    'One or more environment variables are either missing or incorrect:',
    '\n\n',
    issues,
    '\n\n',
  ].join('');
};

/**
 * @public  The shape of the configuration object.
 * @since   18.0.0
 */
export type Config = z.infer<typeof Schema>;

/**
 * @public  Parses and validates pg's configurations from environment
 *          variables. If invalid, prints the errors and exits 1.
 * @since   18.0.0
 */
export const loadConfig = async (env: Bun.Env): Promise<Config> => Promise
  .resolve()
  .then(() => Schema.parseAsync(env))
  .catch(rescue(z.ZodError, error => {
    process.stderr.write(pretty(error));
    process.exit(1);
  }));
