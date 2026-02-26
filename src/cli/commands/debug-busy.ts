import { defineCommand, withContext } from '../command';
import { sleepWhile } from '../../utils';

export const debugBusy = defineCommand(withContext({
  signature: 'busy',
  description: 'Keeps the process alive for testing purposes',
  handle: async (_argv, ctx) => sleepWhile(ctx.signal),
}));
