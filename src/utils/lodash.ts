import type { StringLike } from "../types";

/**
 * @private Same as `Object.prototype.entries` but with better
 *          types.
 * @since   18.0.0
 * @version 1
 */
export const entries = <T extends Record<string, any>>(obj: T) => Object.entries(obj) as [keyof T, T[keyof T]][];

/**
 * @public  Checks whether the given string contains the specified
 *          substring.
 * @since   18.0.0
 * @version 1
 */
export const has = (substring: string) => (str: string) => str.includes(substring);

/**
 * @public  Same as {@link Object.keys}, but properly typed.
 * @since   18.0.0
 * @version 1
 */
export const keys = <T extends Record<string, any>>(obj: T) => Object.keys(obj) as (keyof T)[];

/**
 * @public  Returns the length of the given value, which can be a
 *          string, array, or anything that quacks like an enumerable.
 * @since   18.0.0
 * @version 1
 */
export const len = <T extends { length: number }>(value: T) => value.length;

/**
 * @private Maps over the values of an object.
 * @since   18.0.0
 * @version 1
 */
export const mapValues = <T extends Record<string, any>, U>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T) => U,
): { [K in keyof T]: U } => Object.fromEntries(
  entries(obj).map(([key, value]) => [key, fn(value, key as keyof T)] as const),
) as { [K in keyof T]: U };

/**
 * @public  Maps over the values of an object.
 * @since   18.0.0
 * @version 1
 */
export const pick = <T extends Record<string, any>, S extends keyof T>(
  obj: T,
  keys: S[],
): Pick<T, S> => Object.fromEntries(
  entries(obj).filter(([key, ]) => keys.includes(key as S)),
) as Pick<T, S>;

/**
 * @public  Draws a random element from the given options array.
 * @since   18.0.0
 * @version 1
 */
export const rand = <T>(options: T[]) => options[Math.floor(Math.random() * options.length)];

/**
 * @public  Converts a value that quacks like a string to an actual
 *          string.
 * @since   18.0.0
 * @version 1
 */
export const toString = (value: StringLike | null | undefined) =>
    value === undefined ? ''
  : value === null ? ''
  : typeof value === 'string' ? value
  : value.toString();

/**
 * @public  Trims whitespace from both ends of the given string.
 * @since   18.0.0
 * @version 1
 */
export const trim = (str: string) => str.trim();

/**
 * @public  Removes the given leading character from the string.
 * @since   18.0.0
 * @version 1
 */
export const trimLeading = (str: string, char: string): string => str.startsWith(char)
  ? trimLeading(str.slice(char.length), char)
  : str;

/**
 * @public  Removes the given trailing character from the string.
 * @since   18.0.0
 * @version 1
 */
export const trimTrailing = (str: string, char: string): string => str.endsWith(char)
  ? trimTrailing(str.slice(0, char.length * -1), char)
  : str;
