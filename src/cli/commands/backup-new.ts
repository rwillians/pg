import { statSync } from 'node:fs';
import { $, randomUUIDv7 } from 'bun';
import { execSync } from 'node:child_process';
import { $command, $options } from '../commands';
import { type Context } from '../../context';
import { type Logger } from '../../logger';
import { Backup } from '../../db/backup';
import { s } from '../../utils';

const getPreviousBackupInfo = async (ctx: Context, incremental: boolean) => {
  const { db, logger, s3 } = ctx;

  if (!incremental) {
    return [null, undefined] as const;
  }

  logger.debug('Looking for the last backup');
  const lastBackup = await Backup.latestBy(db, 'completedAt');

  if (!lastBackup) {
    return [null, undefined] as const;
  }

  const localManifestPath = `/tmp/${randomUUIDv7()}`;
  const localFile = Bun.file(localManifestPath);
  const remoteFile = s3.file((lastBackup as any).manifest);

  logger.debug(`Downloading last backup's manifest`);
  await Bun.write(localFile, remoteFile);

  return [lastBackup.id, localManifestPath] as const;
};

const run = (logger: Logger, { fast, backupPath, previousManifestPath }: Record<string, any>) => {
  if (!fast) {
    logger.debug('This may take a while, we\'re waiting for the next checkpoint to finish before taking the backup');
  }

  if (previousManifestPath) {
    return fast
      ? $`pg_basebackup -c fast -D ${backupPath} -P --incremental ${previousManifestPath}`
      : $`pg_basebackup -D ${backupPath} -P --incremental ${previousManifestPath}`;
  }

  return fast
    ? $`pg_basebackup -c fast -D ${backupPath} -P`
    : $`pg_basebackup -D ${backupPath} -P`;
};

const options = $options({
  fast: {
    describe: 'Will not wait for the next checkpoint to finish before taking the backup',
    type: 'boolean',
    default: false,
    alias: 'f',
  },
  incremental: {
    describe: 'Creates an incremental backup containing the data changed since the last backup',
    type: 'boolean',
    default: false,
    alias: 'i',
  },
});

export const backupNew = $command({
  signature: 'new',
  describe: 'Creates a new backup',
  builder: (cli) => cli
    .option('fast', options.fast)
    .option('incremental', options.incremental),
  handler: async (argv, ctx) => {
    const { fast, incremental } = argv;
    const { config, db, logger, s3 } = ctx;

    incremental
      ? logger.info('Incremental backup in progress')
      : logger.info('Full backup in progress');

    const tempId = randomUUIDv7();
    const filename = `${tempId}.tar.gz`;
    const localTarPath = `/tmp/${tempId}/${filename}`;
    const localManifestPath = `/tmp/${tempId}/backup_manifest`;
    const remotePath = `${config.S3_BACKUPS_PREFIX}/${filename}`;
    const remoteManifestPath = `${config.S3_BACKUPS_PREFIX}/${tempId}.manifest`;

    const [previousBackupId, previousManifestPath] = await getPreviousBackupInfo(ctx, incremental);
    if (incremental && !previousBackupId) logger.debug('No previous backup found, falling back to a full backup instead');

    logger.debug('Creating backup')
    const startedAt = new Date();
    const start = performance.now();
    await run(logger, { fast, incremental, backupPath: `/tmp/${tempId}`, previousManifestPath }).text();
    const completedAt = new Date();

    logger.debug('Compressing backup');
    await $`touch /tmp/${tempId}/recovery.signal`.text();
    await $`cd /tmp/${tempId} && tar -zcf ${filename} .`.text();

    logger.debug('Uploading backup to S3');
    await s3.file(remotePath).write(Bun.file(localTarPath));
    await s3.file(remoteManifestPath).write(Bun.file(localManifestPath));

    logger.debug('Updating internal state');
    const backup = await Backup.insertOne(db, {
      parentId: previousBackupId,
      tar: remotePath,
      manifest: remoteManifestPath,
      size: statSync(localTarPath).size,
      startedAt,
      completedAt,
    });

    logger.debug('Deleting temporary files');
    execSync(`rm -rf /tmp/${tempId}`);

    const elapsed = Math.round((performance.now() - start) / 1000);
    logger.info(`Backup ${s.blue(backup.id)} created successfully! Took ${elapsed}s`);
  },
})
