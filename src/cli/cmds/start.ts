import { defineCommand, defineOptions, withContext } from '../cmd';
import * as scheduler from '../../scheduler';
import * as postgres from '../../postgres';
import { timer } from '../../utils';

const options = defineOptions({
  scheduler: {
    describe: 'Run the scheduler alongside the server',
    type: 'boolean' as const,
    default: true,
  },
});

export const start = defineCommand(withContext({
  signature: 'start',
  description: 'Starts the PostgreSQL server',
  build: (cli) => cli.option('scheduler', options.scheduler),
  handle: async (argv, ctx) => {
    const { log, signal } = ctx;

    await postgres.start(ctx);

    log.debug('Waiting for PostgreSQL to become ready');
    await postgres.isReady(ctx);
    log.notice('PostgreSQL is ready to accept connections');

    argv.scheduler
      ? await scheduler.start(ctx)
      : await timer.sleepWhile(signal);
  },
}));
