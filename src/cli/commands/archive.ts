import { $ } from 'bun';
import { $command, $options } from '../commands';
import { s } from '../../utils';

const options = $options({
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

export const archive = $command({
  signature: 'archive',
  describe: 'Archives a WAL segment file to S3',
  builder: (cli) => cli
    .option('path', options.path)
    .option('filename', options.filename),
  handler: async (argv, ctx) => {
    const { path, filename } = argv;
    const { config, logger, s3 } = ctx;

    const localTar = `${path}.tar.gz`;
    const localFile = Bun.file(path);
    const localTarFile = Bun.file(localTar);
    const remoteTarFile = s3.file(`${config.PG_WAL_ARCHIVE_DIR}/${filename}.tar.gz`);

    if (!await localFile.exists()) {
      logger.error(`WAL file not found: ${s.red(path)}`);
      process.exit(1);
    }

    logger.debug('Compressing file');
    await $`tar -zcf ${localTar} ${path}`.text();

    logger.debug(`Uploading WAL file ${s.blue(filename)} to S3`);
    await Bun.write(remoteTarFile, localTarFile);

    logger.debug('Deleting temporary files');
    await localTarFile.unlink();

    logger.info(`WAL file ${s.blue(filename)} successfully archived to S3`)
  },
});
