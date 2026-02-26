/**
 * @private Returns the amount of milliseconds left until the given
 *          timestamp. If the timestamp is in the past, returns
 *          zero.
 * @since  18.0.0
 * @version 1
 */
export const left = (ts: Date) => Math.max(0, ts.valueOf() - Date.now());

/**
 * @public  Semantic sugar code 🦄 for `new Date()`.
 * @since   18.0.0
 * @version 1
 */
export const now = () => new Date();

/**
 * @public  Converts seconds to milliseconds.
 * @since   18.0.0
 * @version 1
 */
export const secs = (n: number) => n * 1000;

/**
 * @public  Converts minutes to milliseconds.
 * @since   18.0.0
 * @version 1
 */
export const minutes = (n: number) => n * 60 * 1000;

/**
 * @public  Converts hours to milliseconds.
 * @since   18.0.0
 * @version 1
 */
export const hours = (n: number) => n * 3600 * 1000;

/**
 * @public  Converts days to milliseconds.
 * @since   18.0.0
 * @version 1
 */
export const days = (n: number) => n * 86400 * 1000;

/**
 * @public  Converts milliseconds to various time units.
 * @since   18.0.0
 */
export const to = {
  /**
   * @public  Converts milliseconds to seconds.
   * @since   18.0.0
   * @version 1
   */
  secs: (ms: number) => (ms / 1000),
  /**
   * @public  Converts milliseconds to minutes.
   * @since   18.0.0
   * @version 1
   */
  minutes: (ms: number) => (ms / (60 * 1000)),
  /**
   * @public  Converts milliseconds to hours.
   * @since   18.0.0
   * @version 1
   */
  hours: (ms: number) => (ms / (3600 * 1000)),
  /**
   * @public  Converts milliseconds to days.
   * @since   18.0.0
   * @version 1
   */
  days: (ms: number) => (ms / (86400 * 1000)),
};
