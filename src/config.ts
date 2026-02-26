import { major } from './utils/pkg' with { type: 'macro' };
import { RuntimeError } from './errors';
import { ascii, p, zc } from './utils';
import { z } from 'zod/v4';

/**
 * @private Runtime environment.
 * @since   18.0.0
 * @version 1
 */
const NODE_ENV = process.env.NODE_ENV || 'prod';

/**
 * @private PostgreSQL's major version that pg was compiled to work
 *          with.
 * @since   18.0.0
 * @version 1
 */
const PG_MAJOR = major();

/**
 * @private The configuration's Zod schema.
 * @since   18.0.0
 */
const Schema = z.object({
  // // // // // // // // // // // // // // // // // // // // // // //
  // PG CLI SETTINGS                                                //
  // // // // // // // // // // // // // // // // // // // // // // //

  /**
   * @optional The slug that identifies the PostgreSQL cluster. When
   *           present, pg files are be stored under a directory named
   *           after the slug.
   *
   *           This allows multiple clusters to safely share the same
   *           S3 bucket by isolating their files in different
   *           directories.
   * @since    18.0.0
   * @version  1
   */
  PG_CLUSTER_SLUG: zc.slug().optional(),

  /**
   * @optional Controls log verbosity.
   * @since    18.0.0
   * @version  1
   */
  PG_LOG_LEVEL: z.enum(['debug', 'info', 'notice', 'warning', 'error']).default('info'),

  /**
   * @optional Mutes all logs except for warnings and errors.
   *
   *           **HINT:** This is particularly useful for testing to
   *           avoid cluttering test output with pg logs.
   * @since    18.0.0
   * @version  1
   */
  PG_SILENCED_LOGS: z.coerce.boolean().default(NODE_ENV === 'test'),

  /**
   * @optional Defines the directory where pg stores its state.
   *
   *           **NOTE:** preferrably use a directory under a docker
   *           volume, but it's not required.
   *
   *           **WARNING:** do NOT use the same volume as PostgreSQL's
   *           data directory!
   * @since    18.0.0
   * @version  1
   */
  PG_STATE_DIR: zc.absolutePath().default('/var/lib/pg'),

  /**
   * @optional Defines the directory where pg stores temporary files,
   *           such as in-progress database backups and dumps.
   *
   *           **IMPORTANT:** Never use a directory under a docker
   *           volume as a temporary directory. This way, temporary
   *           storage used will count towards the container's overlay
   *           storage, will makes it easier to find and safely delete
   *           abandoned temporary files.
   *
   *           **WARNING:** Temporary files can be left behind when pg
   *           crashes or is forcefully stopped while creating backups
   *           or dumps, which can quickly fill up the disk if not
   *           prunned.
   *
   *           **HINT:** Use `pg prune temp` to safely delete
   *           abandoned temporary files.
   * @since    18.0.0
   * @version  1
   */
  PG_TEMP_DIR: zc.absolutePath().default('/tmp/pg'),

  /**
   * @optional Puts pg in read-only mode, this means - but not limited
   *           to:
   *
   *           - will error if requested to archive WAL segments;
   *           - will error if requested to create database backups;
   *           - will error if requested to upload the state database
   *             to S3.
   *           - will error if requested to prune archives on S3; and
   *           - will error if requested to prune backups on S3.
   *
   *           The gist of it is that doing stuff that would create,
   *           update or delete data in S3 are blocked.
   * @since    18.0.0
   * @version  1
   */
  PG_READONLY_MODE: z.coerce.boolean().default(false),

  // // // // // // // // // // // // // // // // // // // // // // //
  // POSTGRES CONFIGURATIONS                                        //
  // // // // // // // // // // // // // // // // // // // // // // //

  /**
   * @required The name of the database to connect to.
   * @since    18.0.0
   * @version  1
   */
  POSTGRES_DB: zc.dbname(),

  /**
   * @optional Defines the amount of memory the database can use for
   *           maintenance operations, such as VACUUM, CREATE INDEX,
   *           etc.
   * @since    18.0.0
   * @version  1
   */
  POSTGRES_MAINTENANCE_WORK_MEM: zc.memsize().default('256MB'),

  /**
   * @optional Defines the maximum number of connections allowed.
   * @since    18.0.0
   * @version  1
   */
  POSTGRES_MAX_CONNECTIONS: z
    .coerce
    .number()
    .int()
    .min(10, { message: 'must be at least 10 connections' })
    .default(100),

  /**
   * @optional Defines the maximum size to let the write-ahead log
   *           grow to between automatic checkpoints.
   *
   *           **NOTE:** setting this to a lower value can help reduce
   *           recovery time in the event of a crash, but setting it
   *           too low can negatively impact performance.
   * @since    18.0.0
   * @version  1
   */
  POSTGRES_MAX_WAL_SIZE: zc.memsize().default('128MB'),

  /**
   * @required A strong password to connect to the database with.
   * @since    18.0.0
   * @version  1
   */
  POSTGRES_PASSWORD: zc.secret(),

  /**
   * @optional Defines the amount of memory the database can use for
   *           shared buffers.
   * @since    18.0.0
   * @version  1
   */
  POSTGRES_SHARED_BUFFERS: zc.memsize().default('256MB'),

  /**
   * @optional Comma-separated list of shared libraries to be loaded
   *           when starting the PostgreSQL server.
   * @since    18.0.0
   * @version  1
   */
  POSTGRES_SHARED_PRELOAD_LIBRARIES: zc
    .nes()
    .regex(/^[a-z][a-z0-9_]+(,[a-z][a-z0-9_]+){0,}$/, { message: 'must be a comma-separated list of shared library names' })
    .default('pg_stat_statements'),

  /**
   * @required The username to connect to the database with.
   * @since    18.0.0
   * @version  1
   */
  POSTGRES_USER: zc.username(),

  // // // // // // // // // // // // // // // // // // // // // // //
  // S3-COMPATIBLE STORAGE                                          //
  // // // // // // // // // // // // // // // // // // // // // // //

  /**
   * @required The endpoint of the S3-compatible storage service.
   * @since    18.0.0
   * @version  1
   */
  S3_ENDPOINT: z.url(),

  /**
   * @optional The region of the S3-compatible storage service.
   * @since    18.0.0
   * @version  1
   */
  S3_REGION: zc.nes().optional(),

  /**
   * @required The name of the S3 bucket to use for storing pg state,
   *           archives, backups, dumps, certificates, etc.
   * @since    18.0.0
   * @version  1
   */
  S3_BUCKET: zc.bucketname(),

  /**
   * @required The access key ID to connect to the S3-compatible
   *           storage.
   * @since    18.0.0
   * @version  1
   */
  S3_ACCESS_KEY_ID: zc.nes(),

  /**
   * @required The secret access key to connect to the S3-compatible
   *           storage.
   * @since    18.0.0
   * @version  1
   */
  S3_SECRET_ACCESS_KEY: zc.nes(),

  /**
   * @optional Defines the prefix directory to store archived WAL
   *           segments.
   *
   *           **NOTE:** if PG_SLUG is set, this will be nested under
   *           the slug directory.
   * @since    18.0.0
   * @version  1
   */
  S3_ARCHIVES_PREFIX: zc.absolutePath().default('/archives'),

  /**
   * @optional Defines the prefix directory to store database backups.
   *
   *           **NOTE:** if PG_SLUG is set, this will be nested under
   *           the slug directory.
   * @since    18.0.0
   * @version  1
   */
  S3_BACKUPS_PREFIX: zc.absolutePath().default('/backups'),

  /**
   * @optional Defines the prefix directory to store database dumps.
   *
   *           **NOTE:** if PG_SLUG is set, this will be nested under
   *           the slug directory.
   * @since    18.0.0
   * @version  1
   */
  S3_DUMPS_PREFIX: zc.absolutePath().default('/dumps'),

  /**
   * @optional Defines the prefix directory to store database TLS
   *           certificates.
   *
   *           **NOTE:** if PG_SLUG is set, this will be nested under
   *           the slug directory.
   * @since    18.0.0
   * @version  1
   */
  S3_CERTS_PREFIX: zc.absolutePath().default('/certs'),

  // // // // // // // // // // // // // // // // // // // // // // //
  // TLS CERTIFICATE CONFIGURATIONS                                 //
  // // // // // // // // // // // // // // // // // // // // // // //

  // /**
  //  * @optional The TTL in days for TLS certificates generated by pg.
  //  * @since    18.0.0
  //  * @version  1
  //  */
  // TLS_SUBJECT_EXPIRY_DAYS: z
  //   .coerce
  //   .number()
  //   .int()
  //   .min(90, { message: 'must be at least 90 days' })
  //   .max(365, { message: 'must be at most 365 days' })
  //   .default(365),
  //
  // /**
  //  * @optional The ISO 3166-1 alpha-2 country code of where your
  //  *           organization is based from (e.g. BR).
  //  * @since    18.0.0
  //  * @version  1
  //  */
  // TLS_SUBJECT_COUNTRY: z.string().default(''),
  //
  // /**
  //  * @optional The state or province where your organization is
  //  *           located from (e.g. São Paulo).
  //  * @since    18.0.0
  //  * @version  1
  //  */
  // TLS_SUBJECT_STATE: z.string().default(''),
  //
  // /**
  //  * @optional The locality (e.g. city) where your organization is
  //  *           located from (e.g. São Paulo).
  //  * @since    18.0.0
  //  * @version  1
  //  */
  // TLS_SUBJECT_LOCALITY: z.string().default(''),
  //
  // /**
  //  * @optional The name of your organization (e.g. ACME Inc).
  //  * @since    18.0.0
  //  * @version  1
  //  */
  // TLS_SUBJECT_ORGANIZATION: z.string().default(''),
  //
  // /**
  //  * @optional The unit or department in your organization that's
  //  *           responsible for the TLS certificates generated by pg
  //  *           (e.g. DevOps).
  //  * @since    18.0.0
  //  * @version  1
  //  */
  // TLS_SUBJECT_ORGANIZATIONAL_UNIT: z.string().default(''),
  //
  // /**
  //  * @optional The domain / subdomain under which this database
  //  *           instance will be served. If you're not gonna expose
  //  *           your database to the internet, then use whatever
  //  *           domain / subdomain you want (e.g. acme.io).
  //  * @since    18.0.0
  //  * @version  1
  //  */
  // TLS_SUBJECT_COMMON_NAME: z.string().default(''),
  //
  // /**
  //  * @required The email address of the unit, department or person in
  //  *           your organization that's responsible for the TLS
  //  *           certificates generated by pg (webmaster@acme.io).
  //  * @since    18.0.0
  //  * @version  1
  //  */
  // TLS_SUBJECT_EMAIL: z.email(),

  // // // // // // // // // // // // // // // // // // // // // // //
  // ASSERT POSTGRES VARIABLES                                      //
  // validates that pg is running on a compatible postgres image    //
  // // // // // // // // // // // // // // // // // // // // // // //

  /**
   * @required Asserts that the PostgreSQL's major version matches
   *           pg's major version.
   *
   *           The pg cli is versioned after the major PostgreSQL
   *           version it supports. For instance, `pg@18.*` supports
   *           PostgreSQL 18.
   * @since    18.0.0
   * @version  1
   */
  PG_MAJOR: z
    .coerce
    .number()
    .int()
    .refine(ver => ver === PG_MAJOR, { message: `must be ${PG_MAJOR}, pg was compiled to work with that version specifically` }),

  /**
   * @required Asserts that PostgreSQL's data directory is set to the
   *           standard path used in official PostgreSQL hardened
   *           images.
   * @since    18.0.0
   * @version  1
   */
  PGDATA: z.literal(`/var/lib/postgresql/${PG_MAJOR}/docker`),

  // // // // // // // // // // // // // // // // // // // // // // //
  // SYSTEM VARIABLES                                               //
  // // // // // // // // // // // // // // // // // // // // // // //

  /**
   * @required I have no idea what this is for, but looks important.
   * @since    18.0.0
   * @version  1
   */
  DOCKER_PG_LLVM_DEPS: zc.nes(),

  /**
   * @optional The system LANG variable, which controls the locale
   *           used when running system commands.
   * @since    18.0.0
   * @version  1
   */
  LANG: zc.nes().default('en_US.utf8'),

  /**
   * @required The system PATH variable, we need to provide it to the
   *           `docker-entrypoint.sh` script when spawning it as a
   *           child process.
   * @since    18.0.0
   * @version  1
   */
  PATH: zc.nes(),

  /**
   * @required The SHA256 hash of the `docker-entrypoint.sh` script,
   *           used to verify the integrity of the script before
   *           executing it.
   * @since    18.0.0
   * @version  1
   */
  PG_SHA256: z.hex().length(64),
});

/**
 * @private Prunes {@link ZodError} issue messages to be more
 *          human-readable.
 * @since   18.0.0
 * @version 1
 */
const prune = (msg: string) => msg.replace(/^Invalid input\: /, '');

/**
 * @public  Error indicating issues with the configuration.
 * @since   18.0.0
 * @version 1
 */
export class ConfigError extends RuntimeError {
  /**
   * @public  The list of validation issues from Zod.
   * @since   18.0.0
   * @version 1
   */
  public readonly issues: z.ZodError['issues'];

  /**
   * @param {z.ZodError} error The original {@link z.ZodError} thrown
   *                           after failing to parse / validate the
   *                           configuration.
   */
  constructor(error: z.ZodError) {
    super('One or more environment variables are either missing or invalid', error, error.stack);
    this.issues = error.issues;
  }

  /**
   * @public  Formats the issues into a human-readable string.
   * @since   18.0.0
   * @version 1
   */
  public override toString(opts: { pretty: boolean } = { pretty: true }) {
    const red = ascii.maybe(ascii.red, { if: opts.pretty });

    const issues = this
      .issues
      .map(({ path, message }) => [path.join('.'), (message ?? '').trim()] as const)
      .filter(([, message]) => message !== '')
      .sort(([a,], [b,]) => a.localeCompare(b))
      .map(([path, message]) => `- field ${red(path)} ${prune(message)}`)
      .join('\n');

    return `${this.message}:\n\n${issues}\n\n`;
  }
}

/**
 * @public  The shape of the configuration object.
 * @since   18.0.0
 * @version 1
 */
export type Config = z.infer<typeof Schema>;

/**
 * @public  Parses and validates pg's configurations from environment
 *          variables. If invalid, it pretty prints the errors then
 *          exits with code 1.
 *
 *          Returns a promise since pg will accept other sources of
 *          configuration that require async IO in the future.
 * @since   18.0.0
 * @version 1
 */
export const loadConfig = async (env: Bun.Env): Promise<Config> => Promise
  .resolve()
  .then(() => Schema.parseAsync(env))
  .catch(p.rescue(z.ZodError, error => p.reject(new ConfigError(error))));
