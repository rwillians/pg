import { type ILogger } from '@rwillians/qx';
import { type Logger } from '../logger';
import { ascii } from '../utils';
import { inspect } from 'bun';

/**
 * @private Paints the given SQL depending on what it does (e.g.
 *          DELETEs are red, SELECTs are green, etc).
 * @since   0.1.21
 * @version 1
 */
const dye = (sql: string) => {
  if (sql.startsWith('CREATE')) return ascii.green(sql);
  if (sql.startsWith('INSERT')) return ascii.green(sql);
  if (sql.startsWith('SELECT')) return ascii.blue(sql);
  if (sql.startsWith('UPDATE')) return ascii.yellow(sql);
  if (sql.startsWith('DELETE')) return ascii.brightRed(sql);
  if (sql.startsWith('DROP')) return ascii.brightRed(sql);
  return sql;
};

/**
 * @private Renders a query parameter value for logging purposes.
 * @since   0.1.21
 * @version 1
 */
const render = (value: unknown): string => {
  if (value === null) return ascii.dim('null');
  if (value === undefined) return ascii.dim('null');
  if (typeof value === 'boolean') return value.toString();
  if (typeof value === 'number') return ascii.blue(value.toString());
  if (typeof value === 'string') return [ascii.dim('`'), value, ascii.dim('`')].join('');
  if (value instanceof Date) return ascii.blue(`${value.toISOString()}`);
  if (Array.isArray(value)) return [ascii.dim('['), value.map(render).join(ascii.dim(', ')), ascii.dim(']')].join('');
  return inspect(value, { colors: true, compact: true, depth: Infinity, sorted: true });
};

/**
 * @private A function that [p]retty-[p]rints the given SQL query, its
 *          parameters and its error.
 * @since   0.1.21
 * @version 1
 */
const pp = (sql: string, params: any[], error?: Error | undefined) => [
  dye(sql),
  ' ',
  render(params),
  error
    ? ('\n\n' + ascii.red(`${ascii.bold(error.constructor.name)} ${error.message}\n${error.stack}`.trim()) + '\n\n')
    : '',
].join('');

/**
 * @private A function that prints the given SQL query, its parameters
 *          and its error as [p]lain [t]ext (no ASCII styling).
 * @since   0.1.21
 * @version 1
 */
const pt = (sql: string, params: any[], error?: Error | undefined) => [
  sql,
  ' ',
  render(params),
  error
    ? ('\n\n' + (`${error.constructor.name} ${error.message}\n${error.stack}`.trim()) + '\n\n')
    : '',
].join('');

/**
 * @private Returns a function that pretty-prints its given arguments
 *          to the specified stream.
 * @since   0.1.21
 * @version 1
 */
const handler = <T extends any[]>(write: (message: string) => any, fn: (...args: T) => string) =>
  (...args: T) => { write(fn(...args)); };

/**
 * @public  Creates a qx logger that pretty-prints queries.
 *
 *          Pretty printing is enabled by default but you can disable
 *          it to print plain-text instead (no ASCII styling), just
 *          set the option `pretty` to `false`.
 * @since   0.1.0
 * @version 3
 *
 * @example
 * ```ts
 * const prettyLogger = createQxLogger(logger);
 * const plainLogger = createQxLogger(logger, { pretty: false });
 * ```
 */
export const createQxLogger = (logger: Logger, opts: { pretty: boolean } = { pretty: true }): ILogger => ({
  debug: handler(logger.debug, opts.pretty ? pp : pt),
  error: handler(logger.error, opts.pretty ? pp : pt),
});
