/**
 * @public  Indicates an implementation error where the user inputed
 *          an invalid argument.
 * @since   18.0.0
 * @version 1
 */
export class ArgumentError extends Error { };

/**
 * @public  Any runtime-related error.
 * @since   18.0.0
 * @version 1
 */
export class RuntimeError extends Error {
  /**
   * @param {string} message The error message.
   * @param {Error}  cause   The original error that caused this
   *                         error, if any.
   * @param {string} stack   The original stack trace, if any.
   */
  constructor(message: string, cause?: Error | undefined, stack?: string | undefined) {
    super(message);

    this.name = this.constructor.name;
    if (cause) this.cause = cause;
    if (stack) this.stack = stack;
  }
}

/**
 * @public  An error indicating that an operation cannot be performed
 *          because pg is in read-only mode.
 * @since   18.0.0
 * @version 1
 */
export class ReadOnlyError extends RuntimeError {
  /**
   * @param {string} action The name of the action that was prevented.
   */
  constructor(action: string) {
    super(`Cannot ${action} while pg is in read-only mode!`);
  }
}
