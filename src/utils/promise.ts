import type { Constructor, InstanceOf, NDOMException, Predicate } from '../types';
import { domException, instanceOf } from './combinators';
import * as is from './type-guards';

/**
 * @public  A function that rejects a promise with the given error.
 *
 *          Its return type is `never` because returning a rejection
 *          is equivalent to throwing an error.
 * @since   18.0.0
 * @version 1
 */
export const reject = (value: Error) => Promise.reject(value) as never;

/**
 * @public  A utility function that allows to catch and handle a
 *          specific error of the specified constructor in a promise
 *          chain.
 * @since   18.0.0
 * @version 1
 *
 * @example using a constructor as predicate:
 * ```ts
 * const user = await findUser(id)
 *    .catch(rescue(NotFoundError, () => null));
 * ```
 *
 * @example using a DOMException name string as predicate:
 * ```ts
 * const user = await findUser(id, { signal })
 *    .catch(rescue('AbortError', () => null));
 * ```
 *
 * @example using a predicate function:
 * ```ts
 * const user = await createUser(params)
 *    .catch(rescue(has('issues'), err => reject(new Error('Failed validation'))));
 * ```
 */
export function rescue<T extends Constructor<Error>, S>(predicate: T, handler: (error: InstanceOf<T>) => S): (error: Error) => S;
export function rescue<T extends string, S>(predicate: T, handler: (error: NDOMException<T>) => S): (error: Error) => S;
export function rescue<T, S>(predicate: Predicate<T>, handler: (error: T) => S): (error: Error) => S;
export function rescue<T, S>(predicate: Constructor<Error> | Predicate<T> | string, handler: (error: any) => S) {
  if (typeof predicate === 'string') return rescue(domException(predicate), handler);
  if (is.ctr(predicate)) return rescue(instanceOf(predicate), handler);

  return (error: Error) => predicate(error)
    ? handler(error)
    : reject(error);
}
