import { defineCommand, defineOptions, withContext } from '../cmd';
import * as scheduler from '../../scheduler';
import { spawn } from 'node:child_process';
import { timer } from '../../utils';
import { $, sleep } from 'bun'

const options = defineOptions({
  scheduler: {
    describe: 'Run the scheduler alongside the server',
    type: 'boolean' as const,
    default: true,
  },
});

export const start = defineCommand(withContext({
  signature: 'start',
  description: 'Starts the PostgreSQL server',
  build: (cli) => cli.option('scheduler', options.scheduler),
  handle: async (argv, ctx) => {
    const { abort, config, log, signal } = ctx;

    const args = [
      'postgres',
      '-c', `max_connections=${config.POSTGRES_MAX_CONNECTIONS}`,
      '-c', `shared_buffers=${config.POSTGRES_SHARED_BUFFERS}`,
      '-c', 'wal_level=replica',
      '-c', 'summarize_wal=on',
      '-c', 'wal_summary_keep_time=30d',
      '-c', `max_wal_size=${config.POSTGRES_MAX_WAL_SIZE}`,
      '-c', 'archive_mode=on',
      '-c', 'archive_command=pg wal archive -p %p -f %f',
      '-c', 'restore_command=pg wal unarchive -p %p -f %f',
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

    spawn('docker-entrypoint.sh', args, options)
      .on('exit', abort)
      .on('close', abort);

    log.debug('Waiting for PostgreSQL to become ready');
    while (true) {
      const result = await $`pg_isready -U ${config.POSTGRES_USER} -d ${config.POSTGRES_DB}`.nothrow().quiet();
      if (result.exitCode === 0) break;
      await sleep(1000);
    }
    log.notice('PostgreSQL is ready to accept connections');

    argv.scheduler
      ? await scheduler.run(ctx)
      : await timer.sleepWhile(signal);
  },
}));
