import { defineCommand, withContext } from '../cmd';
import { fmt, is, noop, rescue } from '../../utils';
import { expr, from, tables } from '../../db';

export const walPrune = defineCommand(withContext({
  signature: 'prune',
  description: 'Prunes stale WAL segments that precede the oldest full backup',
  handle: async (_argv, ctx) => {
    const { config, db, fs, log } = ctx;

    if (config.PG_READONLY_MODE) {
      log.error('Cannot prune WAL segments in read-only mode');
      process.exit(1);
    }

    const oldestBackup = await from(tables.backups.as('b'))
      .where(({ b }) => expr.is(b.parentId, null))
      .orderBy(({ b }) => [expr.asc(b.startedAt)])
      .limit(1)
      .one(db);

    if (!oldestBackup) {
      log.notice('No full backups found, nothing to prune against');
      return;
    }

    const stale = await from(tables.archives.as('a'))
      .where(({ a }) => expr.lt(a.createdAt, oldestBackup.startedAt))
      .all(db);

    if (stale.length === 0) {
      log.notice('No stale WAL segments found');
      return;
    }

    for (const archive of stale) {
      await fs.rm(fs.s3.file(archive.tar)).catch(rescue(is.errorWithCode('ENOENT'), noop));
      await from(tables.archives.as('a'))
        .where(({ a }) => expr.eq(a.id, archive.id))
        .delete(db);
    }

    const reclamed = stale.reduce((sum, a) => sum + a.size, 0);
    log.info(`Pruned ${stale.length} stale WAL segment(s), reclaimed ${fmt.size(reclamed)}`);
  },
}));
