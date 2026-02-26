import { defineCommand, withContext } from '../command';
import { _, c, is, lazy } from '../../utils';
import { spawn } from 'node:child_process';

export const postgresStart = defineCommand(withContext({
  signature: 'start',
  description: 'Starts the PostgreSQL server',
  handle: async (_argv, ctx) => {
    const { config, halt, log, signal } = ctx;

    const cmd = [
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
      '-c', 'shared_preload_libraries=pg_stat_statements',
      '-c', 'autovacuum_vacuum_cost_delay=0',
      '-c', 'maintenance_work_mem=512MB',
    ];

    // cherry-picks the envs to pass to the child process
    const env = lazy(config)
      .then(c.pick(['POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB']))
      .then(c.mapValues(_.toString))
      .unwrap();

    const spawnOptions = {
      cwd: process.cwd(),
      env,
      stdio: 'inherit',
      signal: signal,
      killSignal: 'SIGINT',
    } as const;

    log.info('Starting PostgreSQL server');
    spawn('docker-entrypoint.sh', cmd, spawnOptions)
      .on('error', c.when(c.not(is.abortError), log.error))
      .on('exit', halt);
  },
}));
