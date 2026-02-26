import { defineCommand, withContext } from '../command';
import { _, c, is } from '../../utils';
import { spawn } from 'node:child_process';
// import { sleep } from 'bun';

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
      '-c', `shared_preload_libraries=${config.POSTGRES_SHARED_PRELOAD_LIBRARIES}`,
      '-c', 'autovacuum_vacuum_cost_delay=0',
      '-c', 'maintenance_work_mem=512MB',
    ];

    // const env = _.mapValues(config, _.toString);

    // console.log('env:', env);

    const spawnOptions = {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
      signal: signal,
      killSignal: 'SIGINT',
    } as const;

    log.info('Starting PostgreSQL server');
    spawn('docker-entrypoint.sh', cmd, spawnOptions)
      .on('error', c.when(c.not(is.abortError), log.error))
      .on('exit', halt);

    // await sleep(5000);

    // await postgres
    //   .isready(config, { signal })
    //   .then(() => log.info('PostgreSQL server is ready to accept connections'))
    //   .catch(halt);
  },
}));
