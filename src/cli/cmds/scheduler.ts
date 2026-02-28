import { defineCommand, withContext } from '../cmd';
import { run } from '../../scheduler';

export const scheduler = defineCommand(withContext({
  signature: 'scheduler',
  description: 'Runs scheduled jobs',
  handle: async (_argv, ctx) => {
    await run(ctx);
  },
}));
