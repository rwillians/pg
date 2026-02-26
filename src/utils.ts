import { isAbsolute } from 'node:path';
import crypto from 'node:crypto';

import { column } from '@rwillians/qx';
import { z } from 'zod/v4';

import type { Constructor, InstanceOf } from './types';

/**
 * @public  Lodash-like utility functions.
 * @since   18.0.0
 */
export const _ = {
  /**
   * @public  Checks whether the given string contains the specified
   *          substring.
   * @since   18.0.0
   * @version 1
   */
  has: (substring: string) => (str: string) => str.includes(substring),
  /**
   * @public  Same as {@link Object.keys}, but properly typed.
   * @since   18.0.0
   * @version 1
   */
  keys: <T extends Record<string, any>>(obj: T) => Object.keys(obj) as (keyof T)[],
  /**
   * @public  Returns the length of the given value, which can be a
   *          string, array, or anything that quacks like an enumerable.
   * @since   18.0.0
   * @version 1
   */
  len: <T extends { length: number }>(value: T) => value.length,
  /**
   * @public  Draws a random element from the given options array.
   * @since   18.0.0
   * @version 1
   */
  rand: <T>(options: T[]) => options[Math.floor(Math.random() * options.length)],
  /**
   * @public  Trims whitespace from both ends of the given string.
   * @since   18.0.0
   * @version 1
   */
  trim: (str: string) => str.trim(),
  /**
   * @public  Removes the given leading character from the string.
   * @since   18.0.0
   * @version 1
   */
  trimLeading: (str: string, char: string): string => str.startsWith(char)
    ? _.trimLeading(str.slice(char.length), char)
    : str,
  /**
   * @public  Removes the given trailing character from the string.
   * @since   18.0.0
   * @version 1
   */
  trimTrailing: (str: string, char: string): string => str.endsWith(char)
      ? _.trimTrailing(str.slice(0, char.length * -1), char)
      : str,
};

/**
 * @public  Combinator utility functions.
 * @since   18.0.0
 */
export const c = {
  /**
   * @public  Negates the result of the given predicate function.
   * @since   18.0.0
   * @version 1
   */
  not: <T>(predicate: (...args: T[]) => boolean) => (...args: T[]) => !predicate(...args),
  /**
   * @public  Removes the given leading character from the string.
   * @since   18.0.0
   * @version 1
   */
  trimLeading: (char: string) => (str: string) => _.trimLeading(str, char),
  /**
   * @public  Removes the given trailing character from the string.
   * @since   18.0.0
   * @version 1
   */
  trimTrailing: (char: string) => (str: string) => _.trimTrailing(str, char),
};

/**
 * @public  Promise utility functions.
 * @since   18.0.0
 */
export const p = {
  /**
   * @public  A utility function that allows to catch and handle a
   *          specific error of the specified constructor in a promise
   *          chain.
   * @since   18.0.0
   * @version 1
   *
   * @example
   * ```ts
   * const config = await loadConfig().catch(p.rescue(ConfigError, () => process.exit(1)));
   * ```
   */
  rescue: <T extends Constructor, S>(constructor: T, handler: (error: InstanceOf<T>) => S) =>
    (error: Error): S => error instanceof constructor
      ? handler(error as InstanceOf<T>)
      : p.reject(error),
  /**
   * @public  A function that rejects a promise with the given error.
   *
   *          Its return type is `never` because returning a rejection
   *          is equivalent to throwing an error.
   * @since   18.0.0
   * @version 1
   */
  reject: (value: Error) => Promise.reject(value) as never,
};

/**
 * @private Single-word adjectives for random slug generation.
 * @since   18.0.0
 * @version 1
 */
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

/**
 * @private Single-word subjects for random slug generation.
 * @since   18.0.0
 * @version 1
 */
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
 * @private Utility functions for generating random values.
 * @since   18.0.0
 */
export const gen = {
  /**
   * @public  Generates a URL-safe base64 strong secret of the specified
   *          length.
   * @since   18.0.0
   * @version 1
   */
  secret: (len: number = 32) => crypto.randomBytes(~~(len * 1.5)).toString('base64url').slice(0, len),
  /**
   * @public  Generates a random slug.
   * @since   18.0.0
   * @version 1
   */
  slug: () => `${_.rand(ADJECTIVES)}-${_.rand(ADJECTIVES)}-${_.rand(SUBJECTS)}`,
};

/**
 * @public  Semantic versioning utility functions.
 * @since   18.0.0
 */
export const semver = {
  /**
   * @public  Extracts the major version from the given semver string.
   * @since   18.0.0
   * @version 1
   */
  major: (semver: string) => semver.split('.')[0]!,
}

/**
 * @private Non-exhaustive table of ASCII code for styled console
 *          output.
 * @since   18.0.0
 * @version 1
 */
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
 * @private Either a string or anythig that quacks like a string.
 * @since   18.0.0
 * @version 1
 */
type StringLike = string | { toString: () => string };

/**
 * @private A function type that applies a style to a string.
 * @since   18.0.0
 * @version 1
 */
type Paint = (str: StringLike) => string;

/**
 * @private Returns a function that conditionally applies style to
 *          a string based on the provided boolean flag.
 * @since   18.0.0
 * @version 1
 */
const maybeStyled = (paint: Paint, { if: enabled }: { if: boolean }) => enabled
  ? paint
  : (str: StringLike) => str.toString();

/**
 * @private A registry of style functions for console output, one for
 *          each style in the ASCII codes table.
 * @since   18.0.0
 * @version 1
 */
export const s: {
  [K in keyof typeof ASCII_STYLE_CODES]: Paint;
} & {
  default: Paint;
  maybe: typeof maybeStyled;
} = Object.fromEntries(
  Object
    .entries(ASCII_STYLE_CODES)
    .map(([key, style]) => [key, (str: StringLike) => `\u001b[${style.open}m${str.toString()}\u001b[${style.close}m`])
    .concat([['default', (str: StringLike) => str.toString()], ['maybe', maybeStyled as any]]),
);

/**
 * @private Time-related utility functions.
 * @since   18.0.0
 */
export const time = {
  /**
   * @private Returns the amount of milliseconds left until the given
   *          timestamp.
   * @since  18.0.0
   * @version 1
   */
  left: (ts: Date) => Math.max(0, ts.valueOf() - Date.now()),
};

/**
 * @private A regex that only matches URL-safe base64 strings.
 * @since   18.0.0
 * @version 1
 */
const URL_SAFE_BASE64 = /^[A-Za-z0-9_-]+$/;

/**
 * @private A regex that only matches safe S3 bucket names.
 * @since   18.0.0
 * @version 1
 */
const SAFE_BUCKET_NAME = /^[A-Za-z][A-Za-z0-9_-]+$/;

/**
 * @private A regex that only matches safe postgres object names.
 * @since   18.0.0
 * @version 1
 */
const SAFE_OBJECT_NAME = /^[a-z][a-z0-9_]+$/;

/**
 * @private A regex that only matches safe slug names.
 * @since   18.0.0
 * @version 1
 */
const SAFE_SLUG = /^[a-z][a-z0-9\-]+$/;

/**
 * @private Custom Zod types.
 * @since   18.0.0
 * @version 1
 */
export const zc = {
  /**
   * @private A type that only accepts absolute paths. Leading and
   *          trailing whitespaces are trimmed, and trailing slash is
   *          removed.
   * @since   18.0.0
   * @version 1
   */
  absolutePath: () => zc
    .nes()
    .transform(_.trim)
    .refine(isAbsolute, { message: 'must be an absolute path' })
    .transform(c.trimTrailing('/')),
  /**
   * @private A type that only accepts valid S3 bucket names.
   * @since   18.0.0
   * @version 1
   */
  bucketname: () => z
    .string()
    .min(3, { message: 'must be at least 3 characters long' })
    .max(48, { message: 'must be at most 48 characters long' })
    .regex(SAFE_BUCKET_NAME, { message: `must start with a letter followed by letters, numbers, underscores or dashes (${SAFE_BUCKET_NAME})` }),
  /**
   * @private A type that accepts either a memory or a storage size,
   *          in bytes.
   * @since   18.0.0
   * @version 1
   */
  bytesize: () => z
    .int()
    .min(1, { message: 'must be a positive integer' }),
  /**
   * @private A type that only accepts memory / storage sizes.
   *
   *          The allowed units are:
   *          - Bytes (B);
   *          - Kilobytes (KB);
   *          - Megabytes (MB);
   *          - Gigabytes (GB); and
   *          - Terabytes (TB).
   *
   *          Fractional sizes are not allowed, use a lower unit
   *          instead (e.g. 1.5GB → 1536MB).
   * @since   18.0.0
   * @version 1
   */
  memsize: () => zc
    .nes()
    .transform(_.trim)
    .refine(/^\d+/.test, { message: 'must start with a number' })
    .refine(/\s/.test, { error: 'should not contain spaces' })
    .refine(/[\.,]/.test, { message: 'fractional sizes are not allowed' })
    .refine(/(K|M|G|T)?B$/.test, { message: 'has an invalid size unit, allowed units are B, KB, MB, GB and TB' })
    .refine(/^\d+(K|M|G|T)?B$/.test, { message: 'must be a valid size (e.g. 36B, 96KB, 128MB, 1GB, 2TB)' }),
  /**
   * @private A type that only accepts non-empty strings. Strings that
   *          contain only whitespaces are considered empty.
   *
   *          If non-empty, leading and trailing whitespaces are
   *          preserved.
   * @since   18.0.0
   * @version 1
   */
  nes: () => z
    .string()
    .min(1, { message: 'cannot be empty' })
    .refine(str => _.len(_.trim(str)) >= 0, { message: 'cannot be only whitespaces' }),
  /**
   * @private A type that only accepts strings that are safe to use as
   *          PostgreSQL object names (e.g. username, table, etc).
   * @since   18.0.0
   * @version 1
   */
  objectname: () => z
    .string()
    .min(4, { message: 'must be at least 4 characters long' })
    .max(48, { message: 'must be at most 48 characters long' })
    .regex(SAFE_OBJECT_NAME, { message: `must start with a lowercase letter followed by lowercase letters, numbers or underscores (${SAFE_OBJECT_NAME})` }),
  /**
   * @private A type that only accepts URL-safe base64 strong secrets.
   * @since   18.0.0
   * @version 1
   */
  secret: () => z
    .string()
    .min(16, { message: 'must be at least 16 characters long' })
    .max(72, { message: 'must be at most 72 characters' })
    .regex(URL_SAFE_BASE64, { message: `must contain only characters from url-safe base64 (${URL_SAFE_BASE64})` }),
  /**
   * @private A type that only accepts slugs.
   * @since   18.0.0
   * @version 1
   */
  slug: () => zc
    .nes()
    .regex(SAFE_SLUG, { message: `must start with a letter followed by letters, numbers or dashes (${SAFE_SLUG})` }),
};

/**
 * @private Custom column types for qx (the ORM).
 * @since   18.0.0
 */
export const tc = {
  /**
   * @private A validated column type that expected an absolute path.
   * @since   18.0.0
   * @version 1
   */
  absolutePath: () => column({ type: 'TEXT', schema: zc.absolutePath() }),
  /**
   * @private A validated column that expects a memory / storage size
   *          in bytes.
   * @since   18.0.0
   * @version 1
   */
  bytesize: () => column({ type: 'INTEGER', schema: z.int().min(1) })
};

/**
 * @public  Returns a function that halts the process with the given
 *          exit code. If given an argument, its content is written to
 *          stderr before halting.
 * @since   18.0.0
 * @version 1
 */
export const halt = (exitCode: number) => (value?: StringLike) => {
  if (value) process.stderr.write(value.toString());
  process.exit(exitCode);
};

/**
 * @public  A no-operation function that does nothing and returns
 *          void.
 * @since   18.0.0
 * @version 1
 */
export const noop = () => {};
