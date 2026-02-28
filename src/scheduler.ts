import type { Context } from './context';
import { fmt, noop } from './utils';
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
    { name: 'full-backup',        cron: config.PG_CRON_FULL_BACKUP,        cmd: ['pg', 'backup', 'new'] },
    { name: 'incremental-backup', cron: config.PG_CRON_INCREMENTAL_BACKUP, cmd: ['pg', 'backup', 'new', '-i'] },
  ];

  const entries = jobs.map(job => ({
    ...job,
    cron: new Cron(job.cron),
  }));

  while (true) {
    if (signal.aborted) break;

    const upcoming = entries
      .map(entry => ({ entry, next: entry.cron.nextRun()! }))
      .sort((a, b) => a.next.getTime() - b.next.getTime());

    const { entry, next } = upcoming[0]!;
    const delay = next.getTime() - Date.now();

    if (delay > 0) {
      log.debug(`Sleeping ${fmt.interval(delay)} until next job`);
      await Bun.sleep(delay);
    }

    await $`${{ raw: entry.cmd.join(' ') }}`.catch(noop);
  }

  log.notice('Scheduler stopped');
};
