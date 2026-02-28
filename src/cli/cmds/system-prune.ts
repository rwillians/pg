import { defineCommand } from '../cmd';
import { $ } from 'bun';

export const systemPrune = defineCommand({
  signature: 'prune',
  description: 'Prunes stale backups and WAL segments',
  handle: async (_argv) => {
    await $`pg backup prune`;
    await $`pg wal prune`;
  },
});
