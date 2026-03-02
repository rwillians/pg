import { defineCommand, defineOptions, withContext } from '../cmd';
import { into, tables } from '../../db';
import { ascii } from '../../utils';
import { basename } from 'node:path';
import { $ } from 'bun';

const options = defineOptions({
  path: {
    describe: 'Path to the file to archive',
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

export const archiveUpload = defineCommand(withContext({
  signature: 'archive',
  description: 'Archives a file to S3',
  build: cli => cli
    .option('path', options.path)
    .option('filename', options.filename),
  handle: async (argv, ctx) => {
    const { path, filename } = argv;
    const { config, db, fs, log } = ctx;

    if (config.PG_READONLY_MODE) {
      log.error('Cannot archive files while in read-only mode');
      process.exit(1);
    }

    const file = fs.local.file(fs.local.data.join(path));
    const ltar = fs.local.file(fs.local.temp.join(`${filename}.tar.gz`));
    const star = fs.s3.file(fs.s3.archives.join(`${filename}.tar.gz`));

    if (!await fs.exists(file)) {
      log.error(`File not found: ${ascii.red(file.url)}`);
      process.exit(1);
    }

    log.debug('Compressing file');
    await $`tar -zcf ${ltar.path} -C ${fs.dirname(file)} ${basename(file.path)}`.text();
    const size = await fs.size(ltar);

    log.debug(`Uploading file ${ascii.blue(filename)} to S3`);
    await fs.cp(ltar, star);

    log.debug('Updating internal state');
    await into(tables.archives)
      .values([{ tar: star.path, size, createdAt: new Date() }])
      .insert(db);

    log.debug('Deleting temporary files');
    await fs.rm(ltar);

    log.info(`File ${ascii.blue(filename)} archived to S3`);
  },
}));
