import { withHumanReadableSize } from '../../utils';
import { Backup } from '../../db/backup';
import { $command } from '../commands';

export const backupList = $command({
  signature: 'ls',
  describe: 'Lists all available backups',
  handler: async (_argv, ctx) => {
    const { db } = ctx;
    const backups = await Backup.all(db);

    console.table(backups.map(withHumanReadableSize));
  },
});
