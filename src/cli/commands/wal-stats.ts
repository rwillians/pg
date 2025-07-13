import { humanReadableSize, sumBy } from '../../utils';
import { Archive } from '../../db/archive';
import { $command } from '../commands';

export const walStats = $command({
  signature: 'stats',
  describe: 'Displays statistics about archived WAL segments',
  handler: async (_argv, ctx) => {
    const { db, logger } = ctx;

    logger.debug('Loading archives data');
    const archives = await Archive.all(db);

    logger.debug('Crunching stats');
    const count = archives.length;
    const size = archives.reduce(sumBy('size'), 0);
    logger.debug('Stats ready');

    const stats = [
      { label: 'segments', value: count },
      { label: 'size', value: humanReadableSize(size) },
    ];

    console.table(stats);
  },
});
