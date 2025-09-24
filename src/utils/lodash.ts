/**
 * @public  Functions you'd find in lodash.
 * @since   0.1.0
 */
export const _ = {
  /**
   * @public  Same as {Object.keys} but better typed.
   * @since   0.1.0
   * @version 0.1.0
   */
  keys: <T extends Record<string, any>>(obj: T) => Object.keys(obj) as (keyof T)[],
};
