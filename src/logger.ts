import { _, s } from './utils';

/**
 * Map of all severities, following the RFC 5424 standard.
 * @see https://www.npmjs.com/package/winston#user-content-logging-levels
 */
export const PG_LOG_LEVELS_RFC5424 = {
  emerg:   { code: 0, severity: 'EMERGENCY', short: 'EMG', colors: { accent: s.red       } },
  alert:   { code: 1, severity: 'ALERT',     short: 'ALT', colors: { accent: s.red       } },
  crit:    { code: 2, severity: 'CRITICAL',  short: 'CRT', colors: { accent: s.red       } },
  error:   { code: 3, severity: 'ERROR',     short: 'ERR', colors: { accent: s.red       } },
  warning: { code: 4, severity: 'WARNING',   short: 'WRN', colors: { accent: s.brightRed } },
  notice:  { code: 5, severity: 'NOTICE',    short: 'NOT', colors: { accent: s.yellow    } },
  info:    { code: 6, severity: 'INFO',      short: 'INF', colors: { accent: s.green     } },
  debug:   { code: 7, severity: 'DEBUG',     short: 'DBG', colors: { accent: s.blue      } },
} as const;

export type LogLevelKey = 'debug' | 'info' | 'notice' | 'warning' | 'error';
export type MetricLogLevelKey = 'debug' | 'info' | 'notice';

/**
 * @private
 */
type LogLevel = {
  code: typeof PG_LOG_LEVELS_RFC5424[keyof typeof PG_LOG_LEVELS_RFC5424]['code'];
  severity: string;
  short: string;
  colors: { accent: (str: string) => string };
};

/**
 * @private
 */
type FormatterPayload = {
  message: string;
  timestamp: Date;
};

/**
 * @private
 */
type FormatterConfig = {
  format: (config: FormatterConfig, payload: FormatterPayload) => string;
  logLevel: LogLevel;
};

/**
 * @private
 */
const prettyprint = (config: FormatterConfig, payload: FormatterPayload): string => {
  const { message, timestamp } = payload;
  const [date, time] = timestamp.toISOString().split('T');
  const ts = [date!, time!.slice(0, -1), 'UTC'].join(' ')

  return s.dim(ts)
    + ' '
    + config.logLevel.colors.accent(config.logLevel.short)
    + ' '
    + s.default(message)
    + '\n';
};

/**
 * @private
 */
const getLogFn = (config: FormatterConfig): ((message: string) => void) => {
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
 * @private
 */
const getMetricFn = (config: FormatterConfig) => {
  const { format } = config;
  const stream = process.stdout;

  return (name: string, value: number) => stream.write(format(config, {
    message: `metric ${name}=${value}`,
    timestamp: new Date(),
  }));
};

/**
 * @private
 */
const getMetricLogLevel = <T extends LogLevel>(templateLogLevel: T): LogLevel => ({
  code: templateLogLevel.code,
  severity: 'METRIC',
  short: 'MET',
  colors: templateLogLevel.colors,
}) as const;

export type Logger = {
  debug:    (message: string | Error)     => void;
  info:     (message: string | Error)     => void;
  notice:   (message: string | Error)     => void;
  warning:  (message: string | Error)     => void;
  error:    (message: string | Error)     => void;
  critical: (message: string | Error)     => void;
  alert:    (message: string | Error)     => void;
  emerg:    (message: string | Error)     => void;
  metric:   (name: string, value: number) => void;
};

/**
 * @private
 */
type CreateLoggerOptions = {
  level?: LogLevelKey;
  silent?: boolean;
};

export const createLogger = (options: CreateLoggerOptions) => {
  const {
    level = 'info',
    silent = false,
  } = options;

  const targetLogLevel = silent
    ? PG_LOG_LEVELS_RFC5424.error
    : PG_LOG_LEVELS_RFC5424[level];

  const format = prettyprint;
  const logger: any = {};

  for (const method of _.keys(PG_LOG_LEVELS_RFC5424)) {
    const logLevel = PG_LOG_LEVELS_RFC5424[method];

    logger[method] = logLevel.code <= targetLogLevel.code
      ? getLogFn({ format, logLevel })
      : (_message: string | Error) => void 0;
  }

  logger.metric = silent
    ? (_name: string, _value: number) => void 0
    : getMetricFn({ format, logLevel: getMetricLogLevel(PG_LOG_LEVELS_RFC5424.debug) });

  return logger as Logger;
};
