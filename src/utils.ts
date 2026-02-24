import { isAbsolute } from 'node:path';
import crypto from 'node:crypto';
import { z } from 'zod/v4';

// // // // // // // // // // // // // // // // // // // // // // //
// LODASH-LIKE UTILITY FUNCTIONS                                  //
// // // // // // // // // // // // // // // // // // // // // // //

/**
 * Checks whether the given string contains the specified substring.
 */
export const has = (substring: string) => (str: string) => str.includes(substring);

/**
 * Same as {@link Object.keys}, but properly typed.
 */
export const keys = <T extends Record<string, any>>(obj: T) => Object.keys(obj) as (keyof T)[];

/**
 * Returns the length of the given value, which can be a string,
 * array, or any object that has a `length` property.
 */
export const len = <T extends { length: number }>(value: T) => value.length;

/**
 * Extracts the major version from the given semver string.
 */
export const major = (semver: string) => semver.split('.')[0]!;

/**
 * Negates the result of the given predicate function.
 */
export const not = <T>(predicate: (...args: T[]) => boolean) => (...args: T[]) => !predicate(...args);

/**
 * Draws a random element from the given options array.
 */
export const rand = <T>(options: T[]) => options[Math.floor(Math.random() * options.length)];

/**
 * Removes one instance of the given trailing character from the
 * string, if present.
 */
export const removeTrailing = (char: string) => (str: string) => str.endsWith(char)
  ? str.slice(0, (char.length * -1))
  : str;

/**
 * Trim whitespace from both ends of the given string.
 */
export const trim = (str: string) => str.trim();

/**
 * Lodash-like utility functions.
 */
export const _ = {
  has,
  keys,
  len,
  major,
  not,
  rand,
  removeTrailing,
  trim,
};

// // // // // // // // // // // // // // // // // // // // // // //
// FAKER-LIKE UTILITY FUNCTIONS                                   //
// // // // // // // // // // // // // // // // // // // // // // //

/**
 * Single-word adjectives for random slug generation.
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
 * Single-word subjects for random slug generation.
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
 * Generates a URL-safe base64 strong secret of the specified length.
 */
const secret = (len: number = 32) => crypto
  .randomBytes(~~(len * 1.5))
  .toString('base64url')
  .slice(0, len);

/**
 * Generates a random slug.
 */
const slug = () => `${rand(ADJECTIVES)}-${rand(ADJECTIVES)}-${rand(SUBJECTS)}`;

/**
 * Faker-like utility functions.
 */
export const gen = {
  secret,
  slug,
};

// // // // // // // // // // // // // // // // // // // // // // //
// SIZE UTILITY FUNCTIONS                                         //
// // // // // // // // // // // // // // // // // // // // // // //

/**
 * Utility functions for dealing with sizes (e.g. 64MB, 1GB, etc).
 */
export const size = {
  /**
   * Checks if the given string is a size (e.g. 64MB, 1GB, etc).
   */
  is: (str: string) => /^\d+(KB|MB|GB|TB)$/.test(str),
};

// // // // // // // // // // // // // // // // // // // // // // //
// TERMINAL UTILITY FUNCTIONS                                     //
// // // // // // // // // // // // // // // // // // // // // // //

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
 * Either a string or any object that implements `toString()`.
 */
type StringLike = string | { toString: () => string };

/**
 * Styles for ASCII output.
 */
export const style: {
  [K in keyof typeof ASCII_STYLE_CODES]: (str: StringLike) => string;
} & {
  default: (str: StringLike) => string;
} = Object.fromEntries(
  Object
    .entries(ASCII_STYLE_CODES)
    .map(([key, style]) => [key, (str: StringLike) => `\u001b[${style.open}m${str.toString()}\u001b[${style.close}m`])
    .concat([['default', (str: StringLike) => str.toString()]]), // alias for no style
);

// // // // // // // // // // // // // // // // // // // // // // //
// ZOD CUSTOM TYPES                                               //
// // // // // // // // // // // // // // // // // // // // // // //

const URL_SAFE_BASE64 = /^[A-Za-z0-9_-]+$/;

const SAFE_OBJECT_NAME = /^[a-z][a-z0-9_]+$/;

/**
 * Hand-crafted custom Zod types.
 */
export const zc = {
  /**
   * A type that accepts only absolute paths. Trailing slash is
   * removed if present.
   */
  absolutePath: () => z
    .string()
    .min(1, { message: 'cannot be empty' })
    .refine(isAbsolute, { message: 'must be an absolute path' })
    .transform(removeTrailing('/')),
  /**
   * A type that only accepts memory sizes (e.g. 64MB, 1GB, etc).
   */
  memorySize: () => z
    .string()
    .refine(size.is, { error: 'must be a valid memory size (e.g. 64MB, 1GB, etc)' }),
  /**
   * A type that accepts non-empty strings, where strings that contain
   * only whitespaces are considered empty.
   */
  nen: () => z
    .string()
    .min(1, { message: 'cannot be empty' })
    .refine(str => len(trim(str)) >= 0, { message: 'cannot be only whitespaces' }),
  /**
   * A type that only accepts strings that are safe to use as
   * PostgreSQL object names (e.g. username, table name, etc.).
   */
  objectname: () => z
    .string()
    .min(3, { message: 'must be at least 3 characters long' })
    .max(32, { message: 'must be at most 32 characters long' })
    .regex(SAFE_OBJECT_NAME, { message: `must start with a lowercase letter and contain only lowercase letters, numbers and underscores (${SAFE_OBJECT_NAME})` }),
  /**
   * A type that only accepts URL-safe base64 strong secrets.
   */
  secret: () => z
    .string()
    .min(16, { message: 'must be at least 16 characters long' })
    .max(72, { message: 'let\'s not abuse though, keep it under 72 characters' })
    .regex(URL_SAFE_BASE64, { message: `must contain only characters from url-safe base64 (${URL_SAFE_BASE64})` }),
  /**
   * A type that only accepts storage sizes (e.g. 64MB, 1GB, etc).
   */
  storageSize: () => z
    .string()
    .refine(size.is, { error: 'must be a valid storage size (e.g. 64MB, 1GB, etc)' }),
};
