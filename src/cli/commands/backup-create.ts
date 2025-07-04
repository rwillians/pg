import { statSync } from 'node:fs';
import { $, randomUUIDv7 } from 'bun';
import { execSync } from 'node:child_process';
import { loadState } from '../../state';
import { $command, $options } from '../commands';
import { s } from '../../utils';
import type { Context } from '../../context';

const getPreviousBackupInfo = async (ctx: Context, incremental: boolean) => {
  const { logger, s3 } = ctx;

  if (!incremental) {
    return [null, undefined] as const;
  }

  logger.debug('Looking for the last backup');
  const state = await loadState(ctx);
  const backups = await state.backups.all();
  const lastBackup = backups[backups.length - 1];

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

const options = $options({
  incremental: {
    describe: 'Creates an incremental backup containing the data changed since the last backup',
    type: 'boolean',
    default: false,
    alias: 'i',
  },
});

export const createBackup = $command({
  signature: 'backup:create',
  describe: 'Creates a new backup',
  builder: (cli) => cli.option('incremental', options.incremental),
  handler: async (argv, ctx) => {
    const { config, logger, s3 } = ctx;

    logger.info('Backup in progress');
    const tempId = randomUUIDv7();
    const filename = `${tempId}.tar.gz`;
    const localTarPath = `/tmp/${tempId}/${filename}`;
    const localManifestPath = `/tmp/${tempId}/backup_manifest`;
    const remotePath = `${config.PG_BACKUPS_DIR}/${filename}`;
    const remoteManifestPath = `${config.PG_BACKUPS_DIR}/${tempId}.manifest`;

    const [previousBackupId, manifestPath] = await getPreviousBackupInfo(ctx, argv.incremental);
    if (!previousBackupId) logger.debug('No previous backup found, falling back to a full backup instead');

    logger.debug('Creating backup')
    const startedAt = new Date();
    const start = performance.now();
    manifestPath
      ? await $`pg_basebackup -c fast -D /tmp/${tempId} -P --incremental ${manifestPath}`.text()
      : await $`pg_basebackup -c fast -D /tmp/${tempId} -P`.text();
    const completedAt = new Date();

    logger.debug('Compressing backup');
    await $`touch /tmp/${tempId}/recovery.signal`.text();
    await $`cd /tmp/${tempId} && tar -zcf ${filename} .`.text();

    logger.debug('Uploading backup to S3');
    await s3.file(remotePath).write(Bun.file(localTarPath));
    await s3.file(remoteManifestPath).write(Bun.file(localManifestPath));

    logger.debug('Updating internal state');
    const state = await loadState(ctx);
    const backup = await state.backups.create({
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
