import { defineCommand, withContext } from '../cmd';
import { ascii } from '../../utils';
import { basename } from 'node:path';
import { $ } from 'bun';

export const statePush = defineCommand(withContext({
  signature: 'push',
  description: 'Uploads the state database to S3',
  handle: async (_argv, ctx) => {
    const { config, fs, log } = ctx;

    if (config.PG_READONLY_MODE) {
      log.error('Cannot push state in read-only mode');
      process.exit(1);
    }

    const local = fs.local.file(fs.local.state.join('state.sqlite3'));
    const ltar = fs.local.file(fs.local.temp.join('state.sqlite3.tar.gz'));
    const star = fs.s3.file(fs.s3.state.join('state.sqlite3.tar.gz'));

    if (!await fs.exists(local)) {
      log.error(`State database not found: ${ascii.red(local.url)}`);
      process.exit(1);
    }

    log.debug('Compressing state database');
    await $`tar -zcf ${ltar.path} -C ${fs.dirname(local)} ${basename(local.path)}`.text();

    log.debug(`Uploading state database to ${ascii.blue(star.url)}`);
    await fs.cp(ltar, star);

    log.debug('Deleting temporary files');
    await fs.rm(ltar);

    log.info('State database pushed to S3');
  },
}));
