import { defineCommand, withContext } from '../cmd';
import { start } from '../../scheduler';

export const scheduler = defineCommand(withContext({
  signature: 'scheduler',
  description: 'Runs scheduled jobs',
  handle: async (_argv, ctx) => {
    await start(ctx);
  },
}));
