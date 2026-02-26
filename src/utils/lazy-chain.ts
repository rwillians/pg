/**
 * @private Represents a fulfilled or rejected chain state.
 * @since   18.0.0
 * @version 1
 */
type State<T> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: unknown };

/**
 * @private Deferred computation that produces a State when called.
 * @since   18.0.0
 * @version 1
 */
type Thunk<T> = () => State<T>;

/**
 * @public  Promise-like monad, but for synchronous operations.
 * @since   18.0.0
 */
export class LazyChain<T> {
  /**
   * @private Thunk that produces the chain's state when called.
   * @since   18.0.0
   * @version 1
   */
  private readonly execute: Thunk<T>;

  /**
   * @param {Thunk<T>} execute Thunk that produces the chain's state
   *                           when called.
   */
  private constructor(execute: Thunk<T>) {
    this.execute = execute;
  }

  /**
   * @public  Creates a fulfilled chain from the given value.
   * @since   18.0.0
   * @version 1
   */
  static join<T>(value: T): LazyChain<T> {
    return new LazyChain(() => ({ status: 'fulfilled', value }));
  }

  /**
   * @public  Creates a rejected chain from the given reason.
   * @since   18.0.0
   * @version 1
   */
  static reject(reason: unknown): LazyChain<never> {
    return new LazyChain(() => ({ status: 'rejected', reason }));
  }

  /**
   * @public  Lazily chains a transformation on the fulfilled value.
   *          When both callbacks are provided (i.e. by `await`),
   *          eagerly executes the chain instead.
   * @since   18.0.0
   * @version 3
   */
  then<R1 = T, R2 = never>(
    onFulfilled?: ((value: T) => R1) | null,
    onRejected?: ((reason: unknown) => R2) | null
  ): LazyChain<R1 | R2> {
    if (onRejected) {
      const state = this.execute();

      state.status === 'fulfilled'
        ? onFulfilled?.(state.value)
        : onRejected(state.reason);

      return this as unknown as LazyChain<R1 | R2>;
    }

    return new LazyChain<R1 | R2>(() => {
      const state = this.execute();

      if (state.status === 'rejected') return state;
      if (!onFulfilled) return state as State<R1 | R2>;

      try {
        return { status: 'fulfilled', value: onFulfilled(state.value) };
      } catch (reason) {
        return { status: 'rejected', reason };
      }
    });
  }

  /**
   * @public  Lazily chains a recovery on the rejected reason. Skips
   *          if fulfilled.
   * @since   18.0.0
   * @version 1
   */
  catch<R>(onRejected: (reason: unknown) => R): LazyChain<T | R> {
    return new LazyChain<T | R>(() => {
      const state = this.execute();

      if (state.status === 'fulfilled') {
        return state;
      }

      try {
        return { status: 'fulfilled', value: onRejected(state.reason) };
      } catch (err) {
        return { status: 'rejected', reason: err };
      }
    });
  }

  /**
   * @public  Executes the chain and leaves the monad, returns the
   *          final value. Throws if rejected.
   * @since   18.0.0
   * @version 1
   */
  unwrap(): T {
    const state = this.execute();

    if (state.status === 'rejected') {
      throw state.reason;
    }

    return state.value;
  }
}

/**
 * @public  Alias for {@link LazyChain.join}.
 * @since   18.0.0
 * @version 1
 */
export const lazy = LazyChain.join.bind(LazyChain);
