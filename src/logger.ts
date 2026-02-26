import { type Paint, _, ascii } from './utils';

/**
 * @private Map of all severities, following the RFC 5424 standard.
 * @since   18.0.0
 * @version 1
 *
 * @see https://www.npmjs.com/package/winston#user-content-logging-levels
 */
const PG_LOG_LEVELS_RFC5424 = {
  emerg:   { code: 0, severity: 'EMERGENCY', short: 'EMG', colors: { accent: ascii.red       } },
  alert:   { code: 1, severity: 'ALERT',     short: 'ALT', colors: { accent: ascii.red       } },
  crit:    { code: 2, severity: 'CRITICAL',  short: 'CRT', colors: { accent: ascii.red       } },
  error:   { code: 3, severity: 'ERROR',     short: 'ERR', colors: { accent: ascii.red       } },
  warning: { code: 4, severity: 'WARNING',   short: 'WRN', colors: { accent: ascii.brightRed } },
  notice:  { code: 5, severity: 'NOTICE',    short: 'NOT', colors: { accent: ascii.yellow    } },
  info:    { code: 6, severity: 'INFO',      short: 'INF', colors: { accent: ascii.green     } },
  debug:   { code: 7, severity: 'DEBUG',     short: 'DBG', colors: { accent: ascii.blue      } },
} as const;

/**
 * @private The shape of a log level definition.
 * @since   18.0.0
 * @version 1
 */
type LogLevel = typeof PG_LOG_LEVELS_RFC5424[keyof typeof PG_LOG_LEVELS_RFC5424] | {
  code: number;
  severity: 'METRIC',
  short: 'MET',
  colors: { accent: Paint };
};

/**
 * @private The shape of a payload passed to formatter functions.
 * @since   18.0.0
 * @version 1
 */
type Payload = {
  message: string;
  timestamp: Date;
};

/**
 * @private The shape of a log formatter configuration object.
 * @since   18.0.0
 * @version 1
 */
type Config = {
  format: (config: Config, payload: Payload) => string;
  logLevel: LogLevel;
};

/**
 * @public  The type definition for a log formatter function.
 * @since   18.0.0
 * @version 1
 */
export type Formatter = (config: Config, payload: Payload) => string;

/**
 * @private A simple log formatter that outputs color-coded logs with
 *          timestamps.
 * @since   18.0.0
 * @version 1
 */
export const prettyprint: Formatter = (config, payload) => {
  const { message, timestamp } = payload;
  const [date, time] = timestamp.toISOString().split('T');
  const ts = [date!, time!.slice(0, -1), 'UTC'].join(' ')

  return ascii.dim(ts)
    + ' '
    + config.logLevel.colors.accent(config.logLevel.short)
    + ' '
    + ascii.default(message)
    + '\n';
};

/**
 * @private Factory function that creates a log method for a given log
 *          level.
 * @since   18.0.0
 * @version 1
 */
const getLogFn = (config: Config): ((message: string) => void) => {
  const { format, logLevel } = config;

  const stream = logLevel.code <= PG_LOG_LEVELS_RFC5424.error.code
    ? process.stderr
    : process.stdout;

  const parse = (message: string | Error) => message instanceof Error
    ? (message.stack || message.message)
    : message;

  return (message: string | Error) => stream.write(format(config, {
    message: parse(message),
    timestamp: new Date(),
  }));
};

/**
 * @private Factory function that creates a metric log method.
 * @since   18.0.0
 * @version 1
 */
const getMetricFn = (config: Config) => {
  const { format } = config;
  const stream = process.stdout;

  return (name: string, value: number) => stream.write(format(config, {
    message: `${name}=${value}`,
    timestamp: new Date(),
  }));
};

/**
 * @private Helper function that builds a custom log level for
 *          metrics, based on an existing log level's code and colors.
 * @since   18.0.0
 * @version 1
 */
const buildMetricsCustomLogLevel = <T extends LogLevel>(template: T): LogLevel => ({
  code: template.code,
  severity: 'METRIC',
  short: 'MET',
  colors: template.colors,
}) as const;

/**
 * @public The Logger interface, defining the shape of the logger
 *         object used for logging messages at various levels.
 * @since   18.0.0
 * @version 1
 */
export type Logger = {
  emerg:    (message: string | Error)     => void;
  alert:    (message: string | Error)     => void;
  critical: (message: string | Error)     => void;
  error:    (message: string | Error)     => void;
  warning:  (message: string | Error)     => void;
  notice:   (message: string)             => void;
  info:     (message: string)             => void;
  debug:    (message: string | Error)     => void;
  metric:   (name: string, value: number) => void;
};

/**
 * @private The shape of the options object passed to the
 *          {@link createLogger} function.
 * @since   18.0.0
 * @version 1
 */
type CreateLoggerOptions = {
  level?: keyof typeof PG_LOG_LEVELS_RFC5424;
  silent?: boolean;
  formatter?: Formatter;
};

/**
 * @public  Factory function that creates a logger instance with
 *          methods for each log level.
 * @since   18.0.0
 * @version 1
 */
export const createLogger = (options: CreateLoggerOptions = {}) => {
  const {
    level = 'info',
    silent = false,
    formatter: format = prettyprint,
  } = options;

  const targetLogLevel = silent
    ? PG_LOG_LEVELS_RFC5424.error
    : PG_LOG_LEVELS_RFC5424[level];

  const logger: any = {};

  for (const method of _.keys(PG_LOG_LEVELS_RFC5424)) {
    const logLevel = PG_LOG_LEVELS_RFC5424[method];

    logger[method] = logLevel.code <= targetLogLevel.code
      ? getLogFn({ format, logLevel })
      : (_message: string | Error) => void 0;
  }

  logger.metric = silent
    ? (_name: string, _value: number) => void 0
    : getMetricFn({ format, logLevel: buildMetricsCustomLogLevel(PG_LOG_LEVELS_RFC5424.debug) });

  return logger as Logger;
};
