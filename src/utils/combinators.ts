import type { Constructor, InstanceOf, NDOMException } from '../types';
import * as is from './type-guards';
import * as _ from './lodash';

/**
 * @public  Same as {@link is.instanceOf}, but curryed for better
 *          composability.
 * @since   18.0.0
 * @version 1
 */
export const instanceOf = <T extends Constructor>(constructor: T) =>
  (value: unknown): value is InstanceOf<T> => is.instanceOf(value, constructor);
/**
 * @public  Same as {@link is.domException}, but curryed for better
 *          composability.
 * @since   18.0.0
 * @version 1
 */
export const domException = <T extends string>(subtype: T) =>
  (value: unknown): value is NDOMException<T> => is.domException(value, subtype);

/**
 * @public  Same as {@link _.mapValues}, but curryed for better
 *          composability.
 * @since   18.0.0
 * @version 1
 */
export const mapValues = <T extends Record<string, any>, S>(mapper: (value: T[keyof T]) => S) =>
  (obj: T): { [K in keyof T]: S } => _.mapValues(obj, mapper);

/**
 * @public  Negates the result of the given predicate function.
 * @since   18.0.0
 * @version 1
 */
export const not = <T>(predicate: (...args: T[]) => boolean) =>
  (...args: T[]) => !predicate(...args);

/**
 * @public  Same as {@link _.pick}, but curryed for better
 *          composability.
 * @since   18.0.0
 * @version 1
 */
export const pick = <T extends object, S extends keyof T>(keys: S[]) =>
  (obj: T): Pick<T, S> => _.pick(obj, keys);

/**
 * @public  Same as {@link _.trimLeading}, but curryed for better
 *          composability.
 * @since   18.0.0
 * @version 1
 */
export const trimLeading = (char: string) =>
  (str: string) => _.trimLeading(str, char);

/**
 * @public  Same as {@link _.trimTrailing}, but curryed for better
 *          composability.
 * @since   18.0.0
 * @version 1
 */
export const trimTrailing = (char: string) =>
  (str: string) => _.trimTrailing(str, char);

/**
 * @public  Returns a function that takes a value where, if the
 *          value satisfies the given predicate, then the given
 *          callback is called with the value as its argument;
 *          otherwise, returns void.
 * @since   18.0.0
 * @version 1
 */
export const when = <T, S>(predicate: (value: unknown) => boolean, cb: (value: T) => S) =>
  (value: unknown) => predicate(value)
    ? cb(value as T)
    : void 0;
