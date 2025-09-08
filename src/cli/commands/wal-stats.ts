import { humanReadableSize, sumBy } from '../../utils';
import { $command } from '../commands';

import { archives } from '../../db-v2/archives';
import { from } from '../../db-v2';

export const walStats = $command({
  signature: 'stats',
  describe: 'Displays statistics about archived WAL segments',
  handler: async (_argv, ctx) => {
    const { db, logger } = ctx;

    logger.debug('Loading archives data');
    const rows = await from(archives).all(db);

    logger.debug('Crunching stats...');
    const count = rows.length;
    const size = rows.reduce(sumBy('size'), 0);

    const stats = [
      { label: 'segments', value: count },
      { label: 'size', value: humanReadableSize(size) },
    ];

    console.table(stats);
  },
});
