import { defineCommand, withContext } from '../cmd';
import { spawn } from 'node:child_process';

export const start = defineCommand(withContext({
  signature: 'start',
  description: 'Starts the PostgreSQL server',
  handle: async (_argv, ctx) => {
    const { abort, config, signal } = ctx;

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
  },
}));
