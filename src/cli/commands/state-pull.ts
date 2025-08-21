import { $command } from '../commands';

export const statePull = $command({
  signature: 'pull',
  describe: 'Downloads pg\'s internal state database from S3',
  handler: async (_argv, ctx) => {
    const { config, logger, s3 } = ctx;

    const remoteFile = s3.file('/db.sqlite');
    const localFile = Bun.file(`${config.PG_STATE_DIR}/db.sqlite`);

    if (await localFile.exists()) {
      logger.warning('There\'s already a state db locally, if you want to proceed delete it first');
      return process.exit(1);
    }

    logger.debug('Downloading state database');
    await Bun.write(localFile, remoteFile);

    logger.info('State database downloaded successfully');
  },
});
