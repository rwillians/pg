import type { StringLike } from '../types';
import * as time from './time';
import { sleep } from 'bun';

/**
 * @public  Returns a function that halts the process with the given
 *          exit code. If given an argument, its content is written to
 *          stderr before halting.
 * @since   18.0.0
 * @version 1
 */
export const halt = (exitCode: number) => (value?: StringLike) => {
  if (value) process.stderr.write(value.toString());
  process.exit(exitCode);
};

/**
 * @public  Sleeps until the given signal is aborted.
 * @since   18.0.0
 * @version 1
 */
export const sleepWhile = async (signal: AbortSignal, napLength: number = time.secs(1)) => {
  const fn = async (): Promise<void> => signal.aborted
    ? void 0
    : sleep(napLength).then(fn);

  return fn();
};
