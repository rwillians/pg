import { defineCommand, defineOptions, withContext } from '../cmd';
import { expr, from, tables } from '../../db';
import { ascii } from '../../utils';

const options = defineOptions({
  limit: {
    describe: 'Maximum number of backups to show',
    type: 'number' as const,
    default: 10,
    alias: 'n',
  },
});

const formatSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unit = 0;

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }

  return unit === 0
    ? `${size} ${units[unit]}`
    : `${size.toFixed(1)} ${units[unit]}`;
};

const formatDate = (date: Date): string => {
  const [d, t] = date.toISOString().split('T');

  return `${d} ${t!.slice(0, -1)} UTC`;
};

export const backupLs = defineCommand(withContext({
  signature: 'ls',
  description: 'Lists backups in descending order (most recent first)',
  build: cli => cli
    .option('limit', options.limit),
  handle: async (argv, ctx) => {
    const { limit } = argv;
    const { db, log } = ctx;

    const backups = await from(tables.backups.as('b'))
      .orderBy(({ b }) => [expr.desc(b.completedAt)])
      .limit(limit)
      .all(db);

    if (backups.length === 0) {
      log.notice('No backups found');
      return;
    }

    const rows = backups.map(b => ({
      id: String(b.id),
      type: b.parentId ? 'incremental' : 'full',
      size: formatSize(b.size),
      startedAt: formatDate(b.startedAt),
      completedAt: formatDate(b.completedAt),
    }));

    const col = {
      id:          Math.max(2,  ...rows.map(r => r.id.length)),
      type:        Math.max(4,  ...rows.map(r => r.type.length)),
      size:        Math.max(4,  ...rows.map(r => r.size.length)),
      startedAt:   Math.max(10, ...rows.map(r => r.startedAt.length)),
      completedAt: Math.max(12, ...rows.map(r => r.completedAt.length)),
    };

    const header = [
      'Id'.padEnd(col.id),
      'Type'.padEnd(col.type),
      'Size'.padEnd(col.size),
      'Started At'.padEnd(col.startedAt),
      'Completed At',
    ].join('  ');

    process.stdout.write(ascii.dim(header) + '\n');

    const paintType = (type: string) => type === 'full'
      ? ascii.green(type)
      : ascii.yellow(type);

    for (const row of rows) {
      const line = [
        row.id.padEnd(col.id),
        paintType(row.type.padEnd(col.type)),
        row.size.padStart(col.size),
        ascii.dim(row.startedAt.padEnd(col.startedAt)),
        ascii.dim(row.completedAt),
      ].join('  ');

      process.stdout.write(line + '\n');
    }
  },
}));
