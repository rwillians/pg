import { withContext, defineCommand, defineOptions } from '../command';
import { ascii } from '../../utils';
import { $ } from 'bun';

const options = defineOptions({
  path: {
    describe: 'Path where the WAL segment file should be placed',
    type: 'string',
    demandOption: true,
    alias: 'p',
  },
  filename: {
    describe: 'The name that the file was archived with',
    type: 'string',
    demandOption: true,
    alias: 'f',
  },
});

export const walUnarchive = defineCommand(withContext({
  signature: 'unarchive',
  description: 'Unarchives a WAL segment file from S3',
  build: cli => cli
    .option('path', options.path)
    .option('filename', options.filename),
  handle: async (argv, ctx) => {
    const { path, filename } = argv;
    const { fs, log } = ctx;

    const star = fs.s3.archives.file(`${filename}.tar.gz`);
    const ltar = fs.local.temp.file(`${filename}.tar.gz`);
    const segment = fs.local.data.file(path);

    if (!await fs.exists(star)) {
      log.error(`WAL segment file not found: ${ascii.red(star.url)}`);
      process.exit(1);
    }

    log.debug(`Downloading WAL file ${ascii.blue(filename)} from S3`);
    await fs.cp(star, ltar);

    log.debug('Decompressing file');
    await $`tar -zxf ${ltar.path} -C ${fs.dirname(segment)}`.text();

    log.debug('Deleting temporary files');
    await fs.rm(ltar);

    log.info(`WAL segment ${ascii.blue(filename)} unarchived from S3`)
  },
}));
