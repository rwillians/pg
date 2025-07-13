import { $ } from 'bun';
import { statSync } from 'node:fs';
import { $command, $options } from '../commands';
import { Archive } from '../../db/archive';
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

export const walArchive = $command({
  signature: 'archive',
  describe: 'Archives a WAL segment file to S3',
  builder: (cli) => cli
    .option('path', options.path)
    .option('filename', options.filename),
  handler: async (argv, ctx) => {
    const { path, filename } = argv;
    const { config, db, logger, s3 } = ctx;

    const localTarPath = `${path}.tar.gz`;
    const localFile = Bun.file(path);
    const localTarFile = Bun.file(localTarPath);
    const remoteFilePath = `${config.S3_ARCHIVES_PREFIX}/${filename}.tar.gz`;
    const remoteTarFile = s3.file(remoteFilePath);

    if (!await localFile.exists()) {
      logger.error(`WAL file not found: ${s.red(path)}`);
      process.exit(1);
    }

    logger.debug('Compressing file');
    await $`tar -zcf ${localTarPath} ${path}`.text();

    logger.debug(`Uploading WAL file ${s.blue(filename)} to S3`);
    await Bun.write(remoteTarFile, localTarFile);

    logger.debug('Updating internal state');
    await Archive.insertOne(db, {
      tar: remoteFilePath,
      size: statSync(localTarPath).size,
      archivedAt: new Date(),
    });

    logger.debug('Deleting temporary files');
    await localTarFile.unlink();

    logger.info(`WAL file ${s.blue(filename)} successfully archived to S3`)
  },
});
