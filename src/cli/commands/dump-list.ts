import { withHumanReadableSize } from '../../utils';
import { $command } from '../commands';

import { dumps } from '../../db-v2/dumps';
import { from } from '../../db-v2';

export const dumpList = $command({
  signature: 'ls',
  describe: 'Lists all dumps available',
  handler: async (_argv, ctx) => {
    const { db } = ctx;
    const rows = await from(dumps).all(db);

    console.table(rows.map(withHumanReadableSize));
  },
});
