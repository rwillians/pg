import { _, ascii, is } from './utils';
import type { StringLike } from 'bun';

/**
 * Maps all severities (RFC 5424) to their log level.
 * @see https://www.npmjs.com/package/winston#user-content-logging-levels
 */
const LOG_LEVELS_RFC5424 = {
  emerg:   { code: 0, name: 'EMERGENCY', abbv: 'EMG', skin: { accent: ascii.red       } },
  alert:   { code: 1, name: 'ALERT',     abbv: 'ALT', skin: { accent: ascii.red       } },
  crit:    { code: 2, name: 'CRITICAL',  abbv: 'CRT', skin: { accent: ascii.red       } },
  error:   { code: 3, name: 'ERROR',     abbv: 'ERR', skin: { accent: ascii.red       } },
  warning: { code: 4, name: 'WARNING',   abbv: 'WRN', skin: { accent: ascii.brightRed } },
  notice:  { code: 5, name: 'NOTICE',    abbv: 'NOT', skin: { accent: ascii.yellow    } },
  info:    { code: 6, name: 'INFO',      abbv: 'INF', skin: { accent: ascii.green     } },
  debug:   { code: 7, name: 'DEBUG',     abbv: 'DBG', skin: { accent: ascii.blue      } },
} as const;

/**
 * Severities with code less than or equal to this are considered
 * errors and should be written to stderr.
 */
const ERROR_SEVERITY_CODE = LOG_LEVELS_RFC5424.error.code;

/**
 * @public The shape of a logger object.
 * @since  18.0.0
 */
export type Logger = {
  emerg:    (message: StringLike | Error) => void;
  alert:    (message: StringLike | Error) => void;
  critical: (message: StringLike | Error) => void;
  error:    (message: StringLike | Error) => void;
  warning:  (message: StringLike | Error) => void;
  notice:   (message: StringLike)         => void;
  info:     (message: StringLike)         => void;
  debug:    (message: StringLike | Error) => void;
};

type LogLevel = keyof typeof LOG_LEVELS_RFC5424;

type Severity = typeof LOG_LEVELS_RFC5424[LogLevel];

type Payload = {
  pid: number;
  severity: Severity;
  message: string;
  timestamp: Date;
};

type Printer = (payload: Payload) => string;

type WritterConfig = {
  pid: number;
  severity: Severity;
  streams: { stdout: NodeJS.WriteStream, stderr: NodeJS.WriteStream };
  printer: Printer;
};

const parse = (msg: StringLike | Error | DOMException) => {
  if (!is.error(msg) && !is.DOMException(msg)) return msg.toString();

  return [
    msg.name,
    ': ',
    msg.message,
    '\n\n',
    msg.stack,
  ].join('').trim();
};

const createSeverityWritter = ({ pid, severity, streams, printer }: WritterConfig) => {
  const stream = severity.code <= ERROR_SEVERITY_CODE
    ? streams.stderr
    : streams.stdout;

  return (message: string | Error | DOMException) => stream.write(printer({
    pid,
    severity,
    message: parse(message),
    timestamp: new Date(),
  }));
};

const createPrettyPrinter = ({ colors }: { colors: boolean }): Printer => {
  const text = ascii.maybe(ascii.default, { if: colors });
  const dim = ascii.maybe(ascii.dim, { if: colors });

  return ({ pid, severity, message, timestamp }) => {
    const { abbv, skin } = severity;
    const accent = ascii.maybe(skin.accent, { if: colors });

    const [date, time] = timestamp.toISOString().split('T');
    const ts = [date!, time!.slice(0, -1), 'UTC'].join(' ');

    return [
      dim(ts),
      ' ',
      dim(`[${pid}]`),
      ' ',
      accent(abbv),
      ' ',
      text(message),
      '\n',
    ].join('');
  };
};

/**
 * @public  Creates a logger instance with the given options.
 * @since   18.0.0
 * @version 1
 */
export const createLogger = ({
  pid = process.pid,
  level = 'info',
  silent = false,
  colors = true,
}: {
  pid?: number;
  level?: LogLevel;
  silent?: boolean;
  colors?: boolean;
} = {
  //
}) => {
  const targetLogLevel = silent
    ? LOG_LEVELS_RFC5424.error
    : LOG_LEVELS_RFC5424[level];

  const printer = createPrettyPrinter({ colors });
  const streams = { stdout: process.stdout, stderr: process.stderr };

  const logger: any = {};

  for (const logLevel of _.keys(LOG_LEVELS_RFC5424)) {
    const severity = LOG_LEVELS_RFC5424[logLevel];

    logger[logLevel] = severity.code <= targetLogLevel.code
      ? createSeverityWritter({ pid, severity, streams, printer })
      : () => void 0;
  }

  return logger as Logger;
};
