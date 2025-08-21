import { $command } from '../commands';

export const statePush = $command({
  signature: 'push',
  describe: 'Uploades pg\'s internal state database to S3',
  handler: async (_argv, ctx) => {
    const { config, logger, s3 } = ctx;

    const localFile = Bun.file(`${config.PG_STATE_DIR}/db.sqlite`);
    const remoteFile = s3.file('/db.sqlite');

    if (!await localFile.exists()) {
      logger.error('There\'s no state database locally, aborting');
      return process.exit(1);
    }

    logger.debug('Uploading state database');
    await Bun.write(remoteFile, localFile);

    logger.info('State database uploaded successfully');
  },
});
