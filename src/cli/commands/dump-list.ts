import { withHumanReadableSize } from '../../utils';
import { $command } from '../commands';
import { Dump } from '../../db/dump';

export const dumpList = $command({
  signature: 'ls',
  describe: 'Lists all dumps available',
  handler: async (_argv, ctx) => {
    const { db } = ctx;
    const dumps = await Dump.all(db);

    console.table(dumps.map(withHumanReadableSize));
  },
});
