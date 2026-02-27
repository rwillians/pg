import { defineCommand, defineOptions, withContext } from '../cmd';
import { into, tables } from '../../db';
import { ascii } from '../../utils';
import { basename } from 'node:path';
import { $ } from 'bun';

const options = defineOptions({
  path: {
    describe: 'Path to the WAL segment file',
    type: 'string' as const,
    demandOption: true,
    alias: 'p',
  },
  filename: {
    describe: 'The name which the file must be archived with',
    type: 'string' as const,
    demandOption: true,
    alias: 'f',
  },
});

export const walArchive = defineCommand(withContext({
  signature: 'archive',
  description: 'Archives a WAL segment file to S3',
  build: cli => cli
    .option('path', options.path)
    .option('filename', options.filename),
  handle: async (argv, ctx) => {
    const { path, filename } = argv;
    const { config, db, fs, log } = ctx;

    if (config.PG_READONLY_MODE) {
      log.error('Cannot archive WAL segment in read-only mode');
      process.exit(1);
    }

    const segment = fs.local.file(fs.local.data.join(path));
    const ltar = fs.local.file(fs.local.temp.join(`${filename}.tar.gz`));
    const star = fs.s3.file(fs.s3.archives.join(`${filename}.tar.gz`));

    if (!await fs.exists(segment)) {
      log.error(`WAL segment file not found: ${ascii.red(segment.url)}`);
      process.exit(1);
    }

    log.debug('Compressing file');
    await $`tar -zcf ${ltar.path} -C ${fs.dirname(segment)} ${basename(segment.path)}`.text();
    const size = await fs.size(ltar);

    log.debug(`Uploading WAL segment ${ascii.blue(filename)} to S3`);
    await fs.cp(ltar, star);

    log.debug('Updating internal state');
    await into(tables.archives)
      .values([{ tar: star.path, size, createdAt: new Date() }])
      .insert(db);

    log.debug('Deleting temporary files');
    await fs.rm(ltar);

    log.info(`WAL segment ${ascii.blue(filename)} archived to S3`);
  },
}));
