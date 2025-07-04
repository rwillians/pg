import { statSync } from 'node:fs';
import { randomUUIDv7 } from 'bun';
import { execSync } from 'node:child_process';
import { $command, $options } from '../commands';
import type { Context } from '../../context';
import { loadState } from '../../state';
import { s } from '../../utils';

const redact = (connectionString: string) => {
  const uri = new URL(connectionString);
  if (uri.password) uri.password = '******';

  return uri.toString();
};

const toDumpBaseCommand = (ctx: Context, connectionString: string | undefined) => {
  const { config, logger } = ctx;

  if (!connectionString) {
    return `pg_dump -d ${config.POSTGRES_DB}`;
  }

  const uri = new URL(connectionString);

  if (uri.protocol !== 'postgres:') {
    logger.error(`Expected a PostgreSQL connection string, got ${s.red(connectionString)}`);
    process.exit(1);
  }

  logger.debug(`Using connection string ${s.blue(redact(connectionString))}`);

  return [
    ...(uri.password ? [`PGPASSWORD="${uri.password}"`] : []),
    'pg_dump',
    '-h', uri.hostname,
    '-p', (uri.port ?? 5432).toString(),
    '-U', uri.username,
    '-d', uri.pathname.slice(1),
  ].join(' ').trim();
};

const options = $options({
  connectionString: {
    describe: 'Connection string to database to dump',
    type: 'string',
    alias: 'c',
  },
});

export const createDump = $command({
  signature: 'dump:create',
  describe: 'Creates a new dump file',
  builder: (cli) => cli.options('connection-string', options.connectionString),
  handler: async (argv, ctx) => {
    const { connectionString } = argv;
    const { config, logger, s3 } = ctx;

    const id = randomUUIDv7();
    const localPath = `/tmp/${id}.dump`;
    const localFile = Bun.file(localPath);
    const remotePath = `${config.PG_DUMPS_DIR}/${id}.dump`;
    const remoteFile = s3.file(remotePath);

    logger.info('Dump in progress');
    const dumpBaseCommand = toDumpBaseCommand(ctx, connectionString);
    const startedAt = new Date();
    const start = performance.now();
    execSync(`${dumpBaseCommand} -Fc -Z 9 -c -E "UTF-8" --no-owner --no-privileges --if-exists -f ${localPath}`);
    const completedAt = new Date();

    logger.debug(`Uploading dump file to s3://${remoteFile.name}`);
    await Bun.write(remoteFile, localFile);
    const elapsed = Math.round((performance.now() - start) / 1000);

    logger.debug('Updating internal state');
    const state = await loadState(ctx);
    const dump = await state.dumps.create({
      tar: remotePath,
      size: statSync(localPath).size,
      startedAt,
      completedAt
    });

    logger.info(`Dump ${s.blue(dump.id)} created successfully! Took ${elapsed}s`)
  },
});
