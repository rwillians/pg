import { defineCommand, withContext } from '../cmd';
import { run } from '../../scheduler';

export const scheduler = defineCommand(withContext({
  signature: 'scheduler',
  description: 'Runs scheduled jobs',
  handle: async (_argv, ctx) => {
    const { config } = ctx;

    await run(ctx, [
      { name: 'full-backup',        cron: config.PG_CRON_FULL_BACKUP,        cmd: ['pg', 'backup', 'new'] },
      { name: 'incremental-backup', cron: config.PG_CRON_INCREMENTAL_BACKUP, cmd: ['pg', 'backup', 'new', '-i'] },
    ]);
  },
}));
