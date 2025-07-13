import { $ } from 'bun';
import { $command, $options } from '../commands';

const options = $options({
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

export const walUnarchive = $command({
  signature: 'unarchive',
  describe: 'Unarchives a WAL segment file from S3',
  builder: (cli) => cli
    .option('path', options.path)
    .option('filename', options.filename),
  handler: async (argv, ctx) => {
    const { path, filename } = argv;
    const { config, logger, s3 } = ctx;

    const localTarPath = `${path}.tar.gz`;
    const remoteFile = s3.file(`${config.S3_ARCHIVES_PREFIX}/${filename}.tar.gz`);
    const localTarFile = Bun.file(`${path}.tar.gz`);

    if (!await remoteFile.exists()) {
      logger.error(`WAL file not found: s3://${remoteFile.name}`);
      process.exit(1);
    }

    logger.debug(`Downloading WAL file ${filename} from S3`);
    await Bun.write(localTarFile, remoteFile);

    logger.debug('Decompressing file');
    await $`cd ${config.POSTGRES_DATA_DIR} && tar -zxf ${localTarPath}`.text();

    logger.debug('Deleting temporary files');
    await localTarFile.unlink();

    logger.info(`WAL file ${filename} successfully unarchived from S3`)
  },
});
