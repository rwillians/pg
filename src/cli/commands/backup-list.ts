import { withHumanReadableSize } from '../../utils';
import { $command } from '../commands';

import { backups } from '../../db/backups';
import { from } from '../../db';

export const backupList = $command({
  signature: 'ls',
  describe: 'Lists all available backups',
  handler: async (_argv, ctx) => {
    const { db } = ctx;
    const rows = await from(backups).all(db);

    console.table(rows.map(withHumanReadableSize));
  },
});
