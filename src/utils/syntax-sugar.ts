/**
 * @public  Syntax sugar 🦄, a no-operation function that does nothing
 *          and returns void.
 * @since   18.0.0
 * @version 1
 */
export const noop = () => {};

/**
 * @public  Syntax sugar 🦄, a function that throws the given error.
 *          Specially useful for throwing errors in expressions where
 *          `throw` is not allowed, such as in ternary operators or
 *          nullish coalescing.
 * @since   18.0.0
 * @version 1
 */
export const raise = (error: Error) => { throw error; };
