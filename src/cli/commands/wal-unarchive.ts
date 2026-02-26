import { withContext, defineCommand, defineOptions } from '../command';
import { expr, from, tables } from '../../db';

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

export const unarchive = defineCommand(withContext({
  signature: 'unarchive',
  description: 'Unarchives a WAL segment file from S3',
  build: cli => cli
    .option('path', options.path)
    .option('filename', options.filename),
  handle: async (argv, ctx) => {
    const { path, filename } = argv;
    const { fs, log } = ctx;

    const files = {
      local: {
        tar: fs.local.file(`${path}.tar.gz`),
      },
      s3: {
        tar: fs.s3.archives.file(`${filename}.tar.gz`)
      },
    };

    if (!await fs.exists(files.s3.tar)) {
      log.error(`WAL segment not found in S3: ${fs.s3.path(files.s3.tar)}`);
      process.exit(1);
    }
  },
}));
