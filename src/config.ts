import { z } from 'zod/v4';

const Schema = z.object({
  NODE_ENV: z.enum(['dev', 'test', 'prod']).default('dev'),
  LOG_LEVEL: z.enum(['debug', 'info', 'notice', 'warning', 'error']).default('info'),
  PORT: z.coerce.number().int().min(80).max(65535).default(3000),
});

/**
 * [p]retty [p]rint
 */
const pp = (e: z.ZodError) => {
  const headline = e.message;
  const issues = e.issues.map(i => ({ field: i.path.join('.'), error: i.message }));

  // TODO: print to stderr
  console.error(headline);
  console.table(issues);
};

/**
 * @public  Configuration Object.
 * @since   0.1.0
 * @version 0.1.0
 */
export type Config = z.infer<typeof Schema>;

/**
 * @public  Parses config from environment variables.
 * @since   0.1.0
 * @version 0.1.0
 */
export const parseConfig = (env: Bun.Env) => {
  try {
    return Schema.parse(env);
  } catch (e) {
    if (!(e instanceof z.ZodError)) throw e;
    pp(e);
    process.exit(1);
  }
};


