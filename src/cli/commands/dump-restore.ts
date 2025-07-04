import { existsSync } from 'node:fs';
import { $, randomUUIDv7 } from 'bun';
import { execSync } from 'node:child_process';
import { $command, $options } from '../commands';
import type { Context } from '../../context';
import { loadState } from '../../state';
import { s } from '../../utils';

const deleteTempFiles = (ctx: Context, path: string) => async () => {
  const { logger } = ctx;

  logger.debug(`Deleting temporary files`);
  await $`rm ${path}`
    .text()
    .catch(() => logger.warning(`Failed to delete temporary file ${s.red(path)}, will just leave it there`));
};

const s3Downloader = (ctx: Context, source: string) => async () => {
  const { logger, s3 } = ctx;

  const state = await loadState(ctx);
  const dump = await state.dumps.find(source);

  if (!dump) {
    logger.error(`Dump ${s.blue(source)} not found`);
    process.exit(1);
  }

  const s3File = s3.file(dump.tar);
  const s3Url = `s3://${s3File.name}`;

  if (!await s3File.exists()) {
    logger.error(`Dump file not found at ${s.red(s3Url)}`);
    process.exit(1);
  }

  logger.debug(`Downloading dump from ${s.blue(s3Url)}`);
  const localPath = `/tmp/${randomUUIDv7()}.dump`;
  await Bun.write(Bun.file(localPath), s3File);

  return [localPath, deleteTempFiles(ctx, localPath)] as const;
};

const urlDownloader = (ctx: Context, source: string) => async () => {
  const { logger } = ctx;

  logger.debug(`Downloading dump from ${s.blue(source)}`);
  const localPath = `/tmp/${randomUUIDv7()}.dump`;
  execSync(`wget -O ${localPath} ${source}`);

  return [localPath, deleteTempFiles(ctx, localPath)] as const;
};

const fsDownloader = (ctx: Context, source: string) => async () => {
  const { logger } = ctx;

  if (!existsSync(source)) {
    logger.error(`File ${s.red(source)} not found`);
    process.exit(1);
  }

  logger.debug(`${s.bold('Noice!')} The dump is a file in the local filesystem`);

  const cleanup = async () => {
    logger.debug(`The file was already there before running this command, so it's probably best to not delete it`);
  };

  return [source, cleanup] as const;
};

const selectDownloader = (ctx: Context, source: string) => {
  const { logger } = ctx;

  if (source.match(/^\d+$/)) {
    return [s3Downloader(ctx, source), `dump ${s.blue(source)}`] as const;
  } else {
    logger.debug(`Source isn't a dump id`);
  }

  if (URL.canParse(source)) {
    const url = new URL(source);
    const shortUrl = `${url.protocol}//${url.hostname}` + (url.port ? `:${url.port}` : '');

    return [urlDownloader(ctx, source), `dump at ${s.blue(shortUrl)}`] as const;
  } else {
    logger.debug(`Source isn't a URL`);
  }

  logger.debug(`Assuming source is a path in the file system, let's see how it goes`);
  return [fsDownloader(ctx, source), `dump located at ${s.blue(source)}`] as const;
};

const options = $options({
  source: {
    describe: 'Either the id, path or url of the dump to restore',
    type: 'string',
    demandOption: true,
  },
});

export const restoreDump = $command({
  signature: 'dump:restore <source>',
  describe: 'Restores the database from a dump file',
  builder: (cli) => cli.positional('source', options.source),
  handler: async (argv, ctx) => {
    const { source } = argv;
    const { config, logger } = ctx;

    const [download, title] = selectDownloader(ctx, source);
    logger.info(`Restoring from ${title} into ${s.blue(config.POSTGRES_DB)}, this may take a while`);
    const [path, cleanup] = await download();

    logger.debug('Running pg_restore');
    execSync(`pg_restore --no-owner -d ${config.POSTGRES_DB} ${path}`);

    await cleanup();

    logger.info(`Database ${s.blue(config.POSTGRES_DB)} restored from ${title}`);
  },
});
