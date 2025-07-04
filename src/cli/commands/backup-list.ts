import { withHumanReadableSize } from '../../utils';
import { loadState } from '../../state';
import { $command } from '../commands';

export const listBackups = $command({
  signature: 'backup:list',
  describe: 'Lists all available backups',
  handler: async (_argv, ctx) => {
    const state = await loadState(ctx);
    const backups = await state.backups.all();
    console.table(backups.map(withHumanReadableSize));
  },
});
