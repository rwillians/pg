import { $, sleep } from 'bun';
import { spawn } from 'node:child_process';
import { $command, $options } from '../commands';
import type { Logger } from '../../logger';
import { createApi } from '../../api';
import { s } from '../../utils';

const logIfRelevant = (logger: Logger) => (err: Error) => {
  if (err.name === 'AbortError') return;
  logger.error(err);
};

const options = $options({
  targetTimestamp: {
    describe: 'The target timestamp to recover to (point-in-time recovery)',
    type: 'string',
    alias: 't',
  },
  promote: {
    describe: 'Whether to promote the restored point-in-time state as the primary state',
    type: 'boolean',
    implies: 'target-timestamp',
  },
  api: {
    describe: `Runs the auxiliary API server in the background, use --no-api to disable it`,
    type: 'boolean',
    default: true,
  },
});

export const start = $command({
  signature: 'start',
  describe: 'Starts the PostgreSQL server',
  builder: (cli) => cli
    .option('target-timestamp', options.targetTimestamp)
    .option('promote', options.promote)
    .option('api', options.api),
  handler: async (argv, ctx) => {
    const { targetTimestamp, promote } = argv;
    const { config, logger } = ctx;

    await $`pg certs:install`;

    const cmd = [
      'postgres',
      '-c', `max_connections=${config.POSTGRES_MAX_CONNECTIONS}`,
      '-c', `shared_buffers=${config.POSTGRES_SHARED_BUFFERS}`,
      '-c', 'wal_level=replica',
      '-c', 'summarize_wal=on',
      '-c', 'wal_summary_keep_time=30d',
      '-c', `max_wal_size=${config.POSTGRES_MAX_WAL_SIZE}`,
      '-c', 'archive_mode=on',
      '-c', 'archive_command=pg archive -p %p -f %f',
      '-c', 'restore_command=pg unarchive -p %p -f %f',
      '-c', 'ssl=on',
      '-c', `ssl_ca_file=${config.PG_CERTS_DIR}/root.crt`,
      '-c', `ssl_cert_file=${config.PG_CERTS_DIR}/server.crt`,
      '-c', `ssl_key_file=${config.PG_CERTS_DIR}/server.key`,
      '-c', 'ssl_crl_file=',
      '-c', 'ssl_ciphers=HIGH:MEDIUM:+3DES:!aNULL',
      '-c', 'ssl_prefer_server_ciphers=on',
    ];

    const recoveryMode = await Bun
      .file(`${config.POSTGRES_DATA_DIR}/recovery.signal`)
      .exists();

    if (recoveryMode) {
      logger.notice('Starting in recovery mode');
    }

    if (recoveryMode && targetTimestamp) {
      const action = promote ? 'promote' : 'pause';

      logger.info(`Point-in-time recovery set to ${s.blue(targetTimestamp)}`);
      logger.info(`Recovery action is set to ${s.blue(action)}`);

      cmd.push('-c', `recovery_target_time='${targetTimestamp}'`);
      cmd.push('-c', `recovery_target_action=${action}`);

      await sleep(1000);
    }

    const ac = new AbortController();
    const abort = () => { ac.abort(); };

    const spawnOptions = {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
      signal: ac.signal,
      killSignal: 'SIGINT',
    } as const;

    spawn('docker-entrypoint.sh', cmd, spawnOptions)
      .on('error', logIfRelevant(logger))
      .on('exit', abort);

    process
      .on('SIGINT', abort)
      .on('SIGTERM', abort)
      .on('SIGKILL', abort);

    await createApi(ctx, ac.signal);
  },
});
