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

  // // // // // // // // // // // // // // // // // // // // // // //
  // PG CLI SETTINGS                                                //
  // // // // // // // // // // // // // // // // // // // // // // //

  /**
   * Controls log verbosity.
   */
  LOG_LEVEL: z.enum(['debug', 'info', 'notice', 'warning', 'error']).default('info'),

  /**
   * Mutes all output except for warnings and errors.
   */
  SILENT: z.coerce.boolean().default(NODE_ENV === 'test'),

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

const pretty = (error: z.ZodError) => {
  const header = 'One or more environment variables are either missing or invalid:';

  const issues = error
    .issues
    .filter(({ message }) => (message ?? '').trim() !== '')
    .map(({ path, message }) => `  - field ${style.red(path.join('.'))} ${message}`)
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
