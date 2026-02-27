import type { AbortError, Constructor, Expand, InstanceOf, NDOMException, Predicate } from './types';
import { type StringLike, CryptoHasher } from 'bun';
import { randomBytes } from 'node:crypto';
import { isAbsolute } from 'node:path';
import { z } from 'zod/v4';

//
//  CRYPTOGRAPHY UTILS
//

/**
 * @public Registry of cryptography-related utility functions.
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
 * @public Registry of type-guard functions.
 * @since  18.0.0
 */
export const is = {
  /**
   * @public Returns true if value is an AbortError.
   * @since  18.0.0
   */
  abortError: (value: unknown): value is AbortError => is.domException(value, 'AbortError'),
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
  domException,
  // ↑ hoisted
  /**
   * @public Syntax sugar 🦄 for {@link Error.isError}.
   * @since  18.0.0
   */
  error: Error.isError.bind(Error),
  /**
   * @public Same as `instanceof` but more exhaustive.
   * @since  18.0.0
   */
  instanceof: <T extends Constructor>(value: unknown, constructor: T): value is T =>
    value instanceof constructor || value?.constructor.name === constructor.name,
};

function domException(value: unknown): value is DOMException;
function domException<T extends string>(value: unknown, name: T): value is NDOMException<T>;
function domException(value: unknown, name?: string) {
  return name === undefined
    ? value instanceof DOMException
    : value instanceof DOMException && value.name === name;
}

//
//  LODASH
//

/**
 * @public Registry of lodash-like utility functions.
 * @since  18.0.0
 */
export const _ = {
  /**
   * @public  Same as {@link Object.keys}, but properly typed.
   * @since   18.0.0
   */
  keys: <T extends Record<string, any>>(obj: T) => Object.keys(obj) as (keyof T)[],
  /**
   * @public Draws a random element from the given array of options.
   * @since  18.0.0
   */
  rand: <T>(options: T[]) => options[Math.floor(Math.random() * options.length)]!,
  /**
   * @public Trims the trailing occurrences of a specified character
   *         from a string.
   * @since  18.0.0
   */
  trimTrailing: (str: string, char: string): string => str.endsWith(char)
    ? _.trimTrailing(str.slice(0, char.length * -1), char)
    : str
};

//
//  COMBINATORS
//

/**
 * @public Registry of combinator functions.
 * @since  18.0.0
 */
export const c = {
  /**
   * @public Same as {@link is.domException} but in a combinator form.
   * @since  18.0.0
   */
  domException: <T extends string>(subtype: T) =>
    (value: unknown): value is NDOMException<T> => is.domException(value, subtype),
  /**
   * @public Same as {@link is.instanceof} but in a combinator form.
   * @since  18.0.0
   */
  instanceof: <T extends Constructor>(constructor: T) =>
    (value: unknown): value is InstanceOf<T> => is.instanceof(value, constructor),
  /**
   * @public Negates the result of the given predicate function.
   * @since  18.0.0
   */
  not: <T>(predicate: (arg: T) => boolean) => (arg: T) => !predicate(arg),
  /**
   * @public Checks if a string matches the given regular expression.
   * @since  18.0.0
   */
  test: (regex: RegExp) => (str: string) => regex.test(str),
  /**
   * @public Same as {@link _.trimTrailing} but in a combinator form.
   * @since  18.0.0
   */
  trimTrailing: (char: string) => (str: string) => _.trimTrailing(str, char),
};

//
//  FORMATTERS
//

/**
 * @public Registry of formatting functions.
 * @since  18.0.0
 */
export const fmt = {
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
   * @public Formats a Date object into a human-readable string in
   *         UTC.
   * @since  18.0.0
   */
  timestamp: (date: Date): string => {
    const [d, t] = date.toISOString().split('T');

    return `${d} ${t!.slice(0, -1)} UTC`;
  },
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
 * @public Registry of generator functions.
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

//
//  PROMISES
//

/**
 * @public Registry of promise-related utility functions.
 * @since  18.0.0
 */
export const p = {
  /**
   * @public Same as {@link Promise.reject} but properly typed.
   * @since  18.0.0
   */
  reject: (value: Error) => Promise.reject(value) as never,
  /**
   * @public Defines a promise chain error handler but only for a
   *         specific error. Other errors are re-thrown.
   * @since  18.0.0
   */
  rescue,
  // ↑ hoisted
};

function rescue<T extends Constructor<Error>, S>(predicate: T, handler: (error: InstanceOf<T>) => S): (error: Error) => S;
function rescue<T extends string, S>(predicate: T, handler: (error: NDOMException<T>) => S): (error: Error) => S;
function rescue<T, S>(predicate: Predicate<T>, handler: (error: T) => S): (error: Error) => S;
function rescue<T, S>(predicate: Constructor<Error> | Predicate<T> | string, handler: (error: any) => S) {
  if (typeof predicate === 'string') return rescue(c.domException(predicate), handler);
  if (is.ctr(predicate)) return rescue(c.instanceof(predicate), handler);

  return (error: Error) => predicate(error)
    ? handler(error)
    : p.reject(error);
}

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
 * @public Registry of ASCII style functions.
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
const DBNAME = /^[A-Za-z][A-Za-z0-9_]+$/;
const MEMSIZE = /^(\d+)(K|M|G|T)?B$/;
const SLUG = /^[a-z][a-z0-9\-]+$/;
const URL_BASE64 = /^[A-Za-z0-9_-]+$/;
const USERNAME = /^[A-Za-z][A-Za-z0-9_]+$/;

/**
 * @public Registry of custom Zod types.
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
    .transform(c.trimTrailing('/')),
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
    .refine(c.not(c.test(/\s+/)), { error: 'cannot contain whitespaces' })
    .refine(c.not(c.test(/[,\.]/)), { error: 'cannot contain fractions of a unit' })
    .regex(/(K|M|G|T)?B$/, { error: 'must be in a valid memory unit (B, KB, MB, GB or TB)' })
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
