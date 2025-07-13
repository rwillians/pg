import { $command } from '../commands';

export const stateBackup = $command({
  signature: 'backup',
  describe: 'Backs up the state database to S3',
  handler: async (_argv, ctx) => {
    const { config, logger, s3 } = ctx;

    logger.info('Starting state database backup');
    const localFile = Bun.file(`${config.PG_STATE_DIR}/db.sqlite`);
    const remoteFile = s3.file('/db.sqlite');

    if (!await localFile.exists()) {
      return logger.warning('State database file does not exist, skipping backup');
    }

    logger.debug('Uploading state database');
    await Bun.write(remoteFile, localFile);

    logger.info('State database backup completed successfully');
  },
});
