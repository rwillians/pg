import { defineCommand } from '../cmd';
import { sleep } from 'bun';

export const debugBusy = defineCommand({
  signature: 'busy',
  description: 'Keeps the process alive for testing purposes',
  handle: async (_argv) => {
    while (true) { await sleep(1000); }
  },
});
