import { defineCommand, withContext } from '../cmd';
import { fmt, is, noop, rescue } from '../../utils';
import { expr, from, tables } from '../../db';

export const backupPrune = defineCommand(withContext({
  signature: 'prune',
  description: 'Prunes stale backups older than the retention period',
  handle: async (_argv, ctx) => {
    const { config, db, fs, log } = ctx;

    if (config.PG_READONLY_MODE) {
      log.error('Cannot prune backups in read-only mode');
      process.exit(1);
    }

    const cutoff = new Date(Date.now() - config.PG_BACKUP_RETENTION_DAYS * 86_400_000);

    // Find the most recent full backup older than the retention cutoff
    const landmark = await from(tables.backups.as('b'))
      .where(({ b }) => expr.is(b.parentId, null))
      .where(({ b }) => expr.lt(b.startedAt, cutoff))
      .orderBy(({ b }) => [expr.desc(b.startedAt)])
      .limit(1)
      .one(db);

    if (!landmark) {
      log.notice('No full backups older than retention period, nothing to prune');
      return;
    }

    // Find all backups (full and incremental) older than the landmark
    const stale = await from(tables.backups.as('b'))
      .where(({ b }) => expr.lt(b.startedAt, landmark.startedAt))
      .all(db);

    if (stale.length === 0) {
      log.notice('No stale backups found');
      return;
    }

    for (const backup of stale) {
      await fs.rm(fs.s3.file(backup.tar)).catch(rescue(is.errorWithCode('ENOENT'), noop));
      await fs.rm(fs.s3.file(backup.manifest)).catch(rescue(is.errorWithCode('ENOENT'), noop));
      await from(tables.backups.as('b'))
        .where(({ b }) => expr.eq(b.id, backup.id))
        .delete(db);
    }

    const reclaimed = stale.reduce((sum, b) => sum + b.size, 0);
    log.info(`Pruned ${stale.length} stale backup(s), reclaimed ${fmt.size(reclaimed)}`);
  },
}));
