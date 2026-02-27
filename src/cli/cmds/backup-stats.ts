import { defineCommand, withContext } from '../cmd';
import { from, tables } from '../../db';
import { fmt } from '../../utils';

export const backupStats = defineCommand(withContext({
  signature: 'stats',
  description: 'Shows stats about backups',
  handle: async (_argv, ctx) => {
    const { db, log } = ctx;

    const backups = await from(tables.backups.as('b')).all(db);

    if (backups.length === 0) {
      log.notice('No backups found');
      return;
    }

    const full        = backups.filter(b => !b.parentId);
    const incremental = backups.filter(b => !!b.parentId);

    const totalSize       = backups.reduce((sum, b) => sum + b.size, 0);
    const fullSize        = full.reduce((sum, b) => sum + b.size, 0);
    const incrementalSize = incremental.reduce((sum, b) => sum + b.size, 0);

    const rows = [
      { label: 'All backups:',         count: backups.length.toString(),     size: fmt.size(totalSize) },
      { label: 'Full backups:',        count: full.length.toString(),        size: fmt.size(fullSize) },
      { label: 'Incremental backups:', count: incremental.length.toString(), size: fmt.size(incrementalSize) },
    ];

    const col = {
      label: Math.max(...rows.map(r => r.label.length)),
      count: Math.max(...rows.map(r => r.count.length)),
      size:  Math.max(...rows.map(r => r.size.length)),
    };

    for (const row of rows) {
      const label = row.label.padEnd(col.label);
      const count = row.count.padStart(col.count);
      const size  = row.size.padStart(col.size);

      process.stdout.write(`${label}  ${count}  ${size}\n`);
    }
  },
}));
