import type { AbortError, Constructor, Expand, InstanceOf, NDOMException, Predicate } from './types';
import { type StringLike, CryptoHasher, sleep } from 'bun';
import { randomBytes } from 'node:crypto';
import { isAbsolute } from 'node:path';
import { z } from 'zod/v4';

//
//  CRYPTOGRAPHY UTILS
//

/**
 * @public Cryptography-related utility functions.
 * @since  18.0.0
 */
export const cry = {
  /**
   * @public Computes the SHA-256 hash of the given bytes.
   * @since  18.0.0
   */
  sha256: async (data: Uint8Array<ArrayBuffer>) => new CryptoHasher('sha256')
    .update(data)
    .digest('hex'),
};

//
//  TYPE-GUARDS
//

/**
 * @public Type-guard functions.
 * @since  18.0.0
 */
export const is = {
  /**
   * @public Returns true if value is a DOMException of the specified
   *         subtype.
   * @since  18.0.0
   */
  aSpecificDOMException: <T extends string>(subtype?: T) =>
    (value: unknown): value is typeof subtype extends string ? NDOMException<typeof subtype> : DOMException =>
      subtype === undefined
        ? value instanceof DOMException
        : value instanceof DOMException && value.name === subtype,
  /**
   * @public Returns true if value is an AbortError.
   * @since  18.0.0
   */
  abortError: (value: unknown): value is AbortError => value instanceof Error && value.name === 'AbortError',
  /**
   * @public Returns true if value is a constructor.
   * @since  18.0.0
   */
  ctr: (value: unknown): value is Constructor =>
    typeof value === 'function' && value.prototype && value.prototype.constructor === value,
  /**
   * @public Returns true if value is a DOMException.
   * @since  18.0.0
   */
  DOMException: (value: unknown): value is DOMException => value instanceof DOMException,
  /**
   * @public Syntax sugar 🦄 for {@link Error.isError}.
   * @since  18.0.0
   */
  error: (value: unknown): value is Error => Error.isError(value),
  /**
   * @public Returns true if value is an Error of the specified code.
   * @since  18.0.0
   */
  errorWithCode: <T extends string>(code: T) =>
    (value: unknown): value is Error & { code: T } =>
      value instanceof Error && (value as any).code === code,
  /**
   * @public Same as `instanceof` but more exhaustive.
   * @since  18.0.0
   */
  instanceof: <T extends Constructor>(constructor: T) =>
    (value: unknown): value is InstanceOf<T> =>
      value instanceof constructor || value?.constructor.name === constructor.name,
};

//
//  LODASH
//

/**
 * @public Lodash-like utility functions.
 * @since  18.0.0
 */
export const _ = {
  /**
   * @private Same as `Object.prototype.entries` but with better
   *          types.
   * @since   18.0.0
   * @version 1
   */
  entries: <T extends Record<string, any>>(obj: T) => Object.entries(obj) as [keyof T, T[keyof T]][],
  /**
   * @public  Same as {@link Object.keys}, but properly typed.
   * @since   18.0.0
   */
  keys: <T extends Record<string, any>>(obj: T) => Object.keys(obj) as (keyof T)[],
  /**
   * @private Maps over the values of an object.
   * @since   18.0.0
   * @version 1
   */
  mapValues: <T extends Record<string, any>, U>(
    obj: T,
    fn: (value: T[keyof T], key: keyof T) => U,
  ): { [K in keyof T]: U } => Object.fromEntries(
    _.entries(obj).map(([key, value]) => [key, fn(value, key as keyof T)] as const),
  ) as { [K in keyof T]: U },
  /**
   * @public Draws a random element from the given array of options.
   * @since  18.0.0
   */
  rand: <T>(options: T[]) => options[Math.floor(Math.random() * options.length)]!,
  /**
   * @public  Converts a value that quacks like a string to an actual
   *          string.
   * @since   18.0.0
   * @version 1
   */
  toString: (value: StringLike | undefined) => value === undefined
    ? undefined
    : value.toString(),
  /**
   * @public Returns a function that trims the trailing occurrences of
   *         a specified character from a string.
   * @since  18.0.0
   */
  trimTrailing: (char: string) => (str: string): string => {
    const fn = (str: string): string => str.endsWith(char)
      ? fn(str.slice(0, char.length * -1))
      : str;

    return fn(str);
  },
};

//
//  COMBINATORS
//

/**
 * @public Negates the result of the given predicate function.
 * @since  18.0.0
 */
export const not = <T>(predicate: (arg: T) => boolean) => (arg: T) => !predicate(arg);

/**
 * @public Returns a function that tests a string against the given
 *         regular expression.
 * @since  18.0.0
 */
export const matches = (regex: RegExp) => (str: string) => regex.test(str);

//
//  TIMER
//

/**
 * @public Timer-related utility functions.
 * @since  18.0.0
 */
export const timer = {
  /**
   * @public Convers the given amount of seconds into milliseconds.
   * @since  18.0.0
   */
  secs: (n: number) => ~~(n * 1000),
  /**
   * @public Convers the given amount of minutes into milliseconds.
   * @since  18.0.0
   */
  minutes: (n: number) => ~~(n * 60_000),
  /**
   * @public Convers the given amount of hours into milliseconds.
   * @since  18.0.0
   */
  hours: (n: number) => ~~(n * 3_600_000),
  /**
   * @public Convers the given amount of days into milliseconds.
   * @since  18.0.0
   */
  days: (n: number) => ~~(n * 86_400_000),
  /**
   * @public Sleeps for the given amount of milliseconds or until the
   *         given signal is aborted. The option `nap` controls how
   *         often the signal is checked - too short is heavy on the
   *         CPU, while too long makes the sleep less responsive.
   * @since  18.0.0
   */
  sleep: async (ms: number, { nap = 500, signal }: { nap?: number, signal?: AbortSignal } = { }) => {
    let remaining = ms;

    while (!signal?.aborted && remaining > 0) {
      await sleep(Math.min(nap, remaining));
      remaining -= nap;
    }
  },
  /**
   * @public Sleeps until the given date. The option `nap` controls
   *         how often the signal is checked - too short is heavy on
   *         the CPU, while too long makes the sleep less responsive.
   * @since  18.0.0
   */
  sleepUntil: async (date: Date, { nap = 500, signal }: { nap?: number, signal?: AbortSignal } = { }) => {
    const until = date.valueOf();

    while (!signal?.aborted && Date.now() < until) {
      await sleep(nap);
    }
  },
  /**
   * @public Sleeps until the given AbortSignal is aborted. The option
   *         `nap` controls how often the signal is checked - too
   *         short is heavy on the CPU, while too long makes the sleep
   *         less responsive.
   * @since  18.0.0
   */
  sleepWhile: async (signal: AbortSignal, { nap = 500 }: { nap?: number } = { }) => {
    while (!signal.aborted) { await sleep(nap); }
  },
};

//
//  FORMATTERS
//

/**
 * @public Formatting functions.
 * @since  18.0.0
 */
export const fmt = {
  /**
   * @public Redacts a secret value by replacing all but the first and
   *         last 3 characters with dots.
   */
  redacted: (value: string): string => {
    if (value.length < 10) return '••••••••';

    const head = value.slice(0, 3);
    const tail = value.slice(-3);

    return `${head}${'•'.repeat(value.length - 6)}${tail}`;
  },
  /**
   * @public Formats a byte size into a human-readable string.
   * @since  18.0.0
   */
  size: (bytes: number): string => {
    const units = ['KB', 'MB', 'GB', 'TB'];
    let size = bytes / 1024;
    let unit = 0;

    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit++;
    }

    return `${size.toFixed(2)} ${units[unit]}`;
  },
  /**
   * @public Formats a duration in milliseconds into a human-readable
   *         string (e.g. 1d2h, 23h41m13s).
   * @since  18.0.0
   */
  interval: (ms: number): string => {
    const s = Math.floor(ms / 1000) % 60;
    const m = Math.floor(ms / 60000) % 60;
    const h = Math.floor(ms / 3600000) % 24;
    const d = Math.floor(ms / 86400000);

    if (d > 0) return h > 0 ? `${d}d${h}h` : `${d}d`;
    if (h > 0) return `${h}h${m}m${s}s`;
    if (m > 0) return `${m}m${s}s`;

    return `${s}s`;
  },
  /**
   * @public Formats a Date object into a human-readable string in
   *         UTC.
   * @since  18.0.0
   */
  timestamp: (date: Date): string => {
    const [d, t] = date.toISOString().split('T');

    return `${d} ${t!.slice(0, -1)} UTC`;
  },
  /**
   * @public Returns the duration between a start and end date as a
   *         human-readable string. If the end date is not provided,
   *         uses the current date as the end date.
   * @since  18.0.1
   */
  took: (start: Date, end: Date = new Date()): string => fmt.interval(end.valueOf() - start.valueOf()),
};

//
//  SUGAR 🦄 CODE
//

/**
 * @public Does nothing, like what a good sugar 🦄 code should do.
 * @since  18.0.0
 */
export const noop = () => {};

//
//  PROMISES
//

/**
 * @public Same as {@link Promise.reject} but properly typed.
 * @since  18.0.0
 */
export const reject = (value: Error) => Promise.reject(value) as never;

/**
 * @public Use it to assert that a code-brach is unreachable.
 * @since  18.0.1
 */
export const never = (hint: string = 'Expected this code-branch to be unreachable, yet here we are ¯\\_(ツ)_/¯'): never => {
  throw new Error(hint);
};

/**
 * @public Defines an error handler that only handles errors that
 *         satisfy the given predicate, otherwise re-throws them.
 * @since  18.0.0
 */
export function rescue<T extends Constructor<Error>, S>(predicate: T, handler: (error: InstanceOf<T>) => S): (error: Error) => S;
export function rescue<T extends string, S>(predicate: T, handler: (error: NDOMException<T>) => S): (error: Error) => S;
export function rescue<T, S>(predicate: Predicate<T>, handler: (error: T) => S): (error: Error) => S;
export function rescue<T, S>(predicate: Constructor<Error> | Predicate<T> | string, handler: (error: any) => S) {
  if (typeof predicate === 'string') return rescue(is.aSpecificDOMException(predicate), handler);
  if (is.ctr(predicate)) return rescue(is.instanceof(predicate), handler);

  return (error: Error) => predicate(error)
    ? handler(error)
    : reject(error);
};

//
// TERMINAL
//

const ASCII_STYLE_CODES = {
  blue:      { open: 34, close: 39 },
  bold:      { open:  1, close: 22 },
  brightRed: { open: 91, close: 39 },
  dim:       { open:  2, close: 22 },
  green:     { open: 32, close: 39 },
  italic:    { open:  3, close: 23 },
  red:       { open: 31, close: 39 },
  yellow:    { open: 33, close: 39 },
} as const;

/**
 * @public Applies ASCII style to a string-like value.
 * @since  18.0.0
 */
export type Paint = (str: StringLike) => string;

const maybePaint = (paint: Paint, { if: applicable }: { if: boolean }) => applicable
  ? paint
  : (str: StringLike) => str.toString();

/**
 * @public ASCII style functions.
 * @since  18.0.0
 */
export const ascii: Expand<{
  [K in keyof typeof ASCII_STYLE_CODES]: Paint;
} & {
  default: Paint;
  maybe: (paint: Paint, options: { if: boolean }) => Paint;
}> = Object.fromEntries(
  Object
    .entries(ASCII_STYLE_CODES)
    .map(([key, style]) => [key, (str: StringLike) => `\u001b[${style.open}m${str.toString()}\u001b[${style.close}m`])
    .concat([['default', (str: StringLike) => str.toString()], ['maybe', maybePaint as any]]),
);

//
// ZOD CUSTOM TYPES
//

const BUCKET_NAME = /^[A-Za-z][A-Za-z0-9_-]+$/;
const CRON = /^([^\s]+)(\s([^\s]+)){4}$/;
const DBNAME = /^[A-Za-z][A-Za-z0-9_]+$/;
const MEMSIZE = /^(\d+)(K|M|G|T)B$/;
const SLUG = /^[a-z][a-z0-9\-]+$/;
const URL_BASE64 = /^[A-Za-z0-9_-]+$/;
const USERNAME = /^[A-Za-z][A-Za-z0-9_]+$/;

/**
 * @public Custom Zod types.
 * @since  18.0.0
 */
export const zc = {
  /**
   * @public Only accepts absolute paths.
   * @since  18.0.0
   */
  absolutePath: () => zc
    .nes()
    .refine(isAbsolute, { error: 'must be an absolute path' })
    .refine(str => str !== '/', { error: 'cannot be root' })
    .transform(_.trimTrailing('/')),
  /**
   * @public Only accepts strings that are safe to use as an S3 bucket
   *         name.
   * @since  18.0.0
   */
  bucketname: () => z
    .string()
    .min(3)
    .max(48)
    .regex(BUCKET_NAME, { error: `must start with a letter followed by letters, numbers, underscores or dashes (${BUCKET_NAME})` }),
  /**
   * @public Only accepts cron expressions with 5 fields (minute,
   *         hour, day of month, month, day of week), no seconds
   *         field.
   * @since  18.0.0
   */
  cron: () => zc
    .nes()
    .regex(CRON, { error: 'must be a valid cron expression with 5 fields (minute, hour, day of month, month, day of week), no seconds field' }),
  /**
   * @public Only accepts strings that are safe to use as database
   *         name.
   * @since  18.0.0
   */
  dbname: () => z
    .string()
    .min(3)
    .max(48)
    .regex(DBNAME, { error: `must start with a letter followed by letters, numbers or underscores (${DBNAME})` }),
  /**
   * @public Only accepts strings that represent memory / storage
   *         size.
   * @since  18.0.0
   */
  memsize: () => zc
    .nes()
    // progressive errors to pin-point the issue
    .regex(/^\d+/, { error: 'must start with a number' })
    .refine(not(matches(/\s+/)), { error: 'cannot contain whitespaces' })
    .refine(not(matches(/[,\.]/)), { error: 'cannot contain fractions of a unit' })
    .regex(/(K|M|G|T)B$/, { error: 'must be in a valid memory unit (KB, MB, GB or TB)' })
    .regex(MEMSIZE, { error: `must be a valid memory size (e.g. 56KB, 128MB, 256GB, 1TB)` }),
  /**
   * @public Only accepts non-empy strings. Strings with only
   *         whitespaces are considered empty.
   * @since  18.0.0
   */
  nes: () => z
    .string()
    .min(1, { error: 'cannot be empty' })
    .refine(str => str.trim().length > 0, { error: 'cannot be only whitespaces' }),
  /**
   * @public Only accepts URL-safe base64 strong secrets.
   * @since  18.0.0
   */
  secret: () => z
    .string()
    .min(32)
    .max(72)
    .regex(URL_BASE64, { error: `must contain only characters in url-safe base64 (${URL_BASE64})` }),
  /**
   * @public Only accepts slug-like strings.
   * @since  18.0.0
   */
  slug: () => zc
    .nes()
    .regex(SLUG, { error: `must start with a lowercase letter followed by lowercase letters, numbers or dashes (${SLUG})` }),
  /**
   * @public Only accepts strings that are safe to use as a PostgreSQL
   *         username.
   * @since  18.0.0
   */
  username: () => zc
    .nes()
    .refine(str => str !== 'postgres', { error: 'cannot be "postgres"'})
    .min(16)
    .max(48)
    .regex(USERNAME, { error: `must start with a letter followed by letters, numbers or underscores (${USERNAME})` }),
};

//
//  GENERATORS
//

const ADJECTIVES = [
  'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink',
  'brown', 'black', 'white', 'gray', 'cyan', 'magenta', 'lime',
  'teal', 'indigo', 'violet', 'gold', 'silver', 'bronze', 'quick',
  'lazy', 'happy', 'sad', 'bright', 'dark', 'loud', 'silent', 'fast',
  'slow', 'strong', 'weak', 'brave', 'cowardly', 'clever', 'foolish',
  'kind', 'cruel', 'friendly', 'hostile', 'funny', 'serious',
  'generous', 'stingy', 'honest', 'deceitful', 'loyal', 'treacherous',
  'calm', 'anxious', 'confident', 'shy', 'ambitious',
];

const SUBJECTS = [
  'apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape',
  'honeydew', 'kiwi', 'lemon', 'mango', 'nectarine', 'orange',
  'papaya', 'quince', 'raspberry', 'strawberry', 'tangerine',
  'fruit', 'voavanga', 'watermelon', 'xigua', 'zucchini', 'cat',
  'dog', 'elephant', 'tiger', 'lion', 'bear', 'wolf', 'fox', 'rabbit',
  'deer', 'giraffe', 'zebra', 'kangaroo', 'panda', 'monkey',
  'dolphin', 'shark', 'whale', 'eagle', 'owl', 'sparrow', 'parrot',
  'penguin', 'hamster', 'pig', 'cow', 'horse', 'sheep', 'goat',
  'chicken', 'duck', 'goose', 'turkey', 'hedgehog', 'squirrel',
  'raccoon', 'skunk', 'otter', 'beaver', 'moose', 'buffalo',
  'antelope', 'bison', 'camel', 'llama', 'alpaca', 'donkey',
];

/**
 * @public Functions that generate random values.
 * @since  18.0.0
 */
export const gen = {
  /**
   * @public  Generates a URL-safe base64 strong secret of the specified
   *          length.
   * @since   18.0.0
   * @version 1
   */
  secret: (len: number = 32) => randomBytes(~~(len * 1.5)).toString('base64url').slice(0, len),
  /**
   * @public  Generates a random slug.
   * @since   18.0.0
   * @version 1
   */
  slug: () => `${_.rand(ADJECTIVES)}-${_.rand(ADJECTIVES)}-${_.rand(SUBJECTS)}`,
};
