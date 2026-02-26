/**
 * @private A type that matches any object constructor.
 * @since   18.0.0
 * @version 1
 */
export type Constructor<T = any> = new (...args: any[]) => T;

/**
 * @private A utility type that extracts the instance type from a
 *          constructor.
 * @since   18.0.0
 * @version 1
 */
export type InstanceOf<T> = T extends Constructor<infer S> ? S : never;
