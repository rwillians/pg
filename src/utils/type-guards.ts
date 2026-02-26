import type { AbortError, Constructor, NDOMException } from '../types';
import * as is from './type-guards';

/**
 * @public  Checks whether the given error is an AbortError.
 * @since   18.0.0
 * @version 1
 */
export const abortError = (value: unknown): value is AbortError => is.domException(value, 'AbortError');

/**
 * @public  Checks whether the given value is a constructor.
 * @since   18.0.0
 * @version 1
 */
export const ctr = (value: unknown): value is Constructor => typeof value === 'function' && value.prototype && value.prototype.constructor === value;

/**
 * @public  Checks whether the given error is a DOMException. Can
 *          optionally narrow it down to a specific subtype, such as
 *          `AbortError`.
 * @since   18.0.0
 * @version 1
 */
export function domException(value: unknown): value is DOMException;
export function domException<T extends string>(value: unknown, name: T): value is NDOMException<T>;
export function domException(value: unknown, name?: string) {
  return name === undefined
    ? value instanceof DOMException
    : value instanceof DOMException && value.name === name;
}

/**
 * @public  Syntax sugar 🦄, alias to {@link Error.isError}.
 * @since   18.0.0
 * @version 1
 */
export const error = Error.isError.bind(Error);

/**
 * @public  Same as `instanceof` but more exhaustive.
 * @since   18.0.0
 * @version 1
 */
export const instanceOf = <T extends Constructor>(value: unknown, constructor: T): value is T =>
  value instanceof constructor || value?.constructor.name === constructor.name;
