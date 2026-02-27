import { defineCommand, withContext } from '../cmd';
import { from, tables } from '../../db';
import { fmt } from '../../utils';

export const walStats = defineCommand(withContext({
  signature: 'stats',
  description: 'Shows stats about archived WAL segments',
  handle: async (_argv, ctx) => {
    const { db, log } = ctx;

    const archives = await from(tables.archives.as('a')).all(db);

    if (archives.length === 0) {
      log.notice('No archived WAL segments found');
      return;
    }

    const count = archives.length;
    const totalSize = archives.reduce((sum, a) => sum + a.size, 0);

    process.stdout.write(`Segments: ${count}\n`);
    process.stdout.write(`Total size: ${fmt.size(totalSize)}\n`);
  },
}));
