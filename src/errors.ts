/**
 * @public  Any runtime-related error.
 * @since   18.0.0
 * @version 1
 */
export class RuntimeError extends Error {
  constructor(message: string, cause?: Error | undefined, stack?: string | undefined) {
    super(message);

    this.name = this.constructor.name;
    this.cause = cause;
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
  constructor(action: string) {
    super(`Cannot ${action} when pg is in read-only mode!`);
  }
}
