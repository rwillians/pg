import { defineCommand, withContext } from '../command';

export const postgresStart = defineCommand(withContext({
  signature: 'start',
  description: 'Starts the PostgreSQL server',
  handle: async (_argv, ctx) => {
    const { config } = ctx;

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
      '-c', 'maintenance_work_mem=512MB'
    ];
  },
}));
