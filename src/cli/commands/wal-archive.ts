import { withContext, defineCommand, defineOptions } from '../command';
import { into, tables } from '../../db';
import { ascii } from '../../utils';
import { $ } from 'bun';

const options = defineOptions({
  path: {
    describe: 'Path to the WAL segment file',
    type: 'string',
    demandOption: true,
    alias: 'p',
  },
  filename: {
    describe: 'The name which the file must be archived with',
    type: 'string',
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
    const { db, fs, log } = ctx;

    const segment = fs.local.file(path);
    const ltar = fs.local.temp.file(`${filename}.tar.gz`);
    const star = fs.s3.archives.file(`${filename}.tar.gz`);

    if (!await fs.exists(segment)) {
      log.error(`WAL segment file not found: ${ascii.red(segment.path)}`);
      process.exit(1);
    }

    log.debug('Compressing file');
    await $`tar -zcf ${ltar.path} ${path}`.text();
    const size = await fs.size(ltar);

    log.debug(`Uploading WAL segument ${ascii.blue(filename)} to S3`);
    await fs.cp(ltar, star);

    log.debug('Updating internal state');
    await into(tables.archives)
      .values([{ tar: star.path, size, createdAt: new Date() }])
      .insert(db);

    log.debug('Deleting temporary files');
    await fs.rm(ltar);

    log.info(`WAL segment ${ascii.blue(filename)} archived to S3`)
  },
}));
