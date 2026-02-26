import { spawn } from 'node:child_process';
import type { Config } from '../config';
import { _, time } from '../utils';

/**
 * @public  Await for the database become available to accept
 *          connections, up to a maximum of seconds.
 * @since   18.0.0
 * @version 1
 */
export const isready = async (config: Config, { signal, timeout = time.secs(60) }: { signal: AbortSignal, timeout?: number }) => {
  const { promise, resolve, reject } = Promise.withResolvers();
  const env = _.mapValues({ ...config, PGPASSWORD: config.POSTGRES_PASSWORD }, _.toString);

  const opts = [
    '-q',
    '-d', config.POSTGRES_DB,
    '-t', time.to.secs(timeout).toString(),
    '-U', config.POSTGRES_USER,
  ];

  const child = spawn('pg_isready', opts, {
    env,
    stdio: 'inherit',
    signal,
    killSignal: 'SIGINT',
  });

  child.on('close', (code, signal) =>
      code === 0          ? resolve()
    : code === 1          ? reject(new Error('Rejecting connections'))
    : code === 2          ? reject(null)
    : signal === 'SIGINT' ? reject(new DOMException('Aborted', 'AbortError'))
    : reject(new Error(`pg_isready exited with code ${code} and signal ${signal}`))
  );

  return promise;
};
