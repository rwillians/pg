import { spawn } from 'node:child_process';
import { fmt, is, timer } from './utils';
import type { Context } from './context';
import { Cron } from 'croner';

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
export const start = async (ctx: Context) => {
  const { config, log, signal } = ctx;

  const jobs: Job[] = [
    { name: 'full-backup',        cron: config.PG_CRON_BACKUP,             cmd: ['pg', 'backup', 'new'] },
    { name: 'incremental-backup', cron: config.PG_CRON_INCREMENTAL_BACKUP, cmd: ['pg', 'backup', 'new', '-i'] },
    { name: 'state-push',         cron: config.PG_CRON_STATE_PUSH,         cmd: ['pg', 'state', 'push'] },
    { name: 'system-prune',       cron: config.PG_CRON_SYSTEM_PRUNE,       cmd: ['pg', 'system', 'prune'] },
  ];

  const entries = jobs.map(job => ({
    ...job,
    cron: new Cron(job.cron),
  }));

  const running = new Map<string, ReturnType<typeof spawn>>();

  log.notice('Scheduler started');
  while (!signal.aborted) {
    const upcoming = entries
      .map(entry => ({ entry, next: entry.cron.nextRun()! }))
      .sort((a, b) => a.next.getTime() - b.next.getTime());

    const soonest = upcoming[0]!.next;
    const delay = soonest.getTime() - Date.now();

    if (delay > 0) {
      log.debug(`Sleeping ${fmt.interval(delay)} until next job`);
      await timer.sleepUntil(soonest, { signal });
      if (signal.aborted) break;
    }

    const now = Date.now();

    for (const { entry, next } of upcoming) {
      if (next.getTime() > now) break;

      if (running.has(entry.name)) {
        log.info(`Skipping '${entry.name}' — still running`);
        continue;
      }

      log.info(`Running '${entry.name}'`);
      const child = spawn(entry.cmd[0]!, entry.cmd.slice(1), {
        cwd: process.cwd(),
        env: process.env,
        stdio: 'inherit',
        signal,
        killSignal: 'SIGINT',
      });

      child.on('error', (e) => is.abortError(e) ? void 0 : log.error(e))
           .on('close', () => running.delete(entry.name))
           .on('exit', () => running.delete(entry.name));

      running.set(entry.name, child);
    }
  }

  log.notice('Scheduler stopped');
};
