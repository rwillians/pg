import { spawn } from 'node:child_process';
import type { Context } from './context';
import { timer } from './utils';
import { $ } from 'bun';

/**
 * @public Resolves to `true` if and when PostgreSQL becomes ready to
 *         accept connections. On timeout, resolves to `false`.
 * @since  18.0.0
 */
export const isReady = async (
  { config, signal }: Context,
  { timeout = timer.minutes(5) }: { timeout?: number } = { },
) => {
  const raw = `pg_isready -U ${config.POSTGRES_USER} -d ${config.POSTGRES_DB}`;
  let remaining = timeout;

  while (!signal.aborted) {
    const startedAt = Date.now();
    const elapsed = () => Date.now() - startedAt;

    const result = await $`${{ raw }}`.nothrow().quiet();
    if (result.exitCode === 0) return true;
    if (signal.aborted) break;

    const nap = Math.min(1000, remaining - elapsed());
    await timer.sleep(nap, { signal });

    remaining -= elapsed();
    if (remaining <= 0) break;
  }

  return false;
};

/**
 * @public Starts the PostgreSQL server.
 * @since  18.0.0
 */
export const start = async ({
  abort,
  config,
  fs,
  log,
  signal,
}: Context) => {
  const recoveryFlag = fs.local.file(fs.local.data.join('recovery.signal'));
  if (await fs.exists(recoveryFlag)) log.notice('PostgreSQL is starting in recovery mode');

  const args = [
    'postgres',
    '-c', `max_connections=${config.POSTGRES_MAX_CONNECTIONS}`,
    '-c', `shared_buffers=${config.POSTGRES_SHARED_BUFFERS}`,
    '-c', 'wal_level=replica',
    '-c', 'summarize_wal=on',
    '-c', 'wal_summary_keep_time=14d',
    '-c', `max_wal_size=${config.POSTGRES_MAX_WAL_SIZE}`,
    '-c', 'archive_mode=on',
    '-c', 'archive_command=pg archive upload -p %p -f %f',
    '-c', 'restore_command=pg archive download -p %p -f %f',
    '-c', `shared_preload_libraries=${config.POSTGRES_SHARED_PRELOAD_LIBRARIES}`,
    '-c', 'autovacuum_vacuum_cost_delay=0',
    '-c', `maintenance_work_mem=${config.POSTGRES_MAINTENANCE_WORK_MEM}`,
  ];

  const options = {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    signal,
    killSignal: 'SIGINT',
  } as const;

  return spawn('docker-entrypoint.sh', args, options)
    .on('exit', abort)
    .on('close', abort);
};

/**
 * @public Stops a PostgreSQL server child process.
 * @since  18.0.0
 */
export const stop = async (child: ReturnType<typeof spawn>) => new Promise<void>((resolve) => {
  child.on('close', resolve);
  child.kill('SIGINT');
});
