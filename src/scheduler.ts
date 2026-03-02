import type { Context } from './context';
import { fmt, noop, timer } from './utils';
import { Cron } from 'croner';
import { $ } from 'bun';

type Job = {
  name: string;
  cron: string;
  cmd: string[];
};

/**
 * @public Creates and runs a scheduler loop that executes jobs based
 *         on their cron expressions. The loop runs until the
 *         context's signal is aborted.
 * @since  18.0.0
 */
export const run = async (ctx: Context) => {
  const { config, log, signal } = ctx;

  const jobs: Job[] = [
    { name: 'backup',             cron: config.PG_CRON_BACKUP,             cmd: ['pg', 'backup', 'new'] },
    { name: 'incremental-backup', cron: config.PG_CRON_INCREMENTAL_BACKUP, cmd: ['pg', 'backup', 'new', '-i'] },
    { name: 'system-prune',       cron: config.PG_CRON_SYSTEM_PRUNE,       cmd: ['pg', 'system', 'prune'] },
  ];

  const entries = jobs.map(job => ({
    ...job,
    cron: new Cron(job.cron),
  }));

  log.notice('Scheduler started');
  while (!signal.aborted) {
    const upcoming = entries
      .map(entry => ({ entry, next: entry.cron.nextRun()! }))
      .sort((a, b) => a.next.getTime() - b.next.getTime());

    const { entry, next } = upcoming[0]!;
    const delay = next.getTime() - Date.now();

    if (delay > 0) {
      log.debug(`Sleeping ${fmt.interval(delay)} until next job`);
      await timer.sleepUntil(next, { signal });
      if (signal.aborted) break;
    }

    await $`${{ raw: entry.cmd.join(' ') }}`.catch(noop);
  }

  log.notice('Scheduler stopped');
};
