/**
 * @public  A type that represents a DOMException of type AbortError.
 * @since   18.0.0
 * @version 1
 */
export type AbortError = NDOMException<'AbortError'>;

/**
 * @private A type that matches any object constructor.
 * @since   18.0.0
 * @version 1
 */
export type Constructor<T = any> = new (...args: any[]) => T;

/**
 * @private Little trick to force TypeScript to resolve types instead
 *          of composing them.
 * @since   18.0.0
 * @version 1
 */
export type Expand<T> = T extends infer O extends object ? { [K in keyof O]: O[K] } : never;

/**
 * @private A utility type that extracts the instance type from a
 *          constructor.
 * @since   18.0.0
 * @version 1
 */
export type InstanceOf<T> = T extends Constructor<infer S> ? S : never;

/**
 * @public  A type definition that narrows a DOMException to a
 *          specific subtype, such as `AbortError`.
 * @since   18.0.0
 * @version 1
 *
 * @example
 * ```ts
 * type AbortError = NDOMException<'AbortError'>;
 * ```
 */
export type NDOMException<T extends string> = DOMException & { name: T };

/**
 * @public  The signature of a predicate function. Can optionally be
 *          used to extract the asserted type from a type guard.
 * @since   18.0.0
 * @version 1
 */
export type Predicate<T = any> = (value: unknown) => value is T;

/**
 * @private Either a string or anything that quacks like a string.
 * @since   18.0.0
 * @version 1
 */
export type StringLike = string | { toString: () => string };
