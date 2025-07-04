import { withHumanReadableSize } from '../../utils';
import { loadState } from '../../state';
import { $command } from '../commands';

export const listDumps = $command({
  signature: 'dump:list',
  describe: 'Lists all dumps available',
  handler: async (_argv, ctx) => {
    const state = await loadState(ctx);
    const dumps = await state.dumps.all();
    console.table(dumps.map(withHumanReadableSize));
  },
});
