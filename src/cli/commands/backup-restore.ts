import { execSync } from 'node:child_process';
import { $command, $options } from '../commands';
import { loadState } from '../../state';
import { s } from '../../utils';

const options = $options({
  id: {
    describe: 'The id of the backup to restore',
    type: 'string',
    demandOption: true,
  },
  force: {
    describe: 'Confirm destructive action',
    type: 'boolean',
    default: false,
    alias: 'f',
  },
});

export const restoreBackup = $command({
  signature: 'backup:restore <id>',
  describe: 'Restores the database from backup stored in S3',
  builder: (cli) => cli
    .positional('id', options.id)
    .option('force', options.force),
  handler: async (argv, ctx) => {
    const { id, force } = argv;
    const { config, logger, s3 } = ctx;

    if (!force) {
      logger.warning(`Restoring from a backup is a ${s.bold('DANGEROUS ACTION')} because it will erase all existing data from the database as part of the restoration process`);
      logger.warning(`Please make sure to do a backup of ${s.blue(config.POSTGRES_DATA_DIR)} before proceeding`);
      logger.warning(`When you're ready to proceed then rerun this command with the ${s.brightRed('--force')} flag`);
      process.exit(1);
    }

    const state = await loadState(ctx);
    const backup = await state.backups.find(id);

    if (!backup) {
      logger.error(`Backup ${s.blue(id)} not found`);
      process.exit(1);
    }

    const backupFile = s3.file(backup.tar);

    if (!await backupFile.exists()) {
      logger.error(`Backup file not found: s3://${backupFile.name}`);
      process.exit(1);
    }

    logger.info(`Restoring from backup ${s.blue(backup.id)}`);
    const tempTar = `/tmp/bb-${backup.id}.tar.gz`;
    const destTar = `${config.POSTGRES_DATA_DIR}/bb-${backup.id}.tar.gz`;

    logger.debug('Downloading backup from S3');
    await Bun.write(Bun.file(tempTar), backupFile);

    logger.debug('Erasing the contents of the Postgres data directory');
    execSync(`cd ${config.POSTGRES_DATA_DIR} && rm -rf *`);

    logger.debug('Extracting the contents of the backup');
    execSync(`mv ${tempTar} ${destTar}`);
    execSync(`cd ${config.POSTGRES_DATA_DIR} && tar -zxf bb-${backup.id}.tar.gz`);

    execSync(`touch ${config.POSTGRES_DATA_DIR}/recovery.signal`);
    logger.debug('Recovery signal created');

    logger.debug('Deleting temporary files');
    execSync(`rm ${destTar}`);

    logger.info(`Backup ${s.blue(backup.id)} is ready for recovery!`);
  },
});
