import { defineCommand, defineOptions, withContext } from '../cmd';
import { ascii } from '../../utils';
import { basename } from 'node:path';
import { $ } from 'bun';

const options = defineOptions({
  force: {
    describe: 'Push even if state is already up to date',
    type: 'boolean' as const,
    default: false,
  },
});

export const statePush = defineCommand(withContext({
  signature: 'push',
  description: 'Uploads the state database to S3',
  build: cli => cli
    .option('force', options.force),
  handle: async (argv, ctx) => {
    const { force } = argv;
    const { config, fs, log } = ctx;

    if (config.PG_READONLY_MODE) {
      log.error('Cannot push state in read-only mode');
      process.exit(1);
    }

    const local = fs.local.file(fs.local.state.join('state.sqlite3'));
    const ltar = fs.local.file(fs.local.temp.join('state.sqlite3.tar.gz'));
    const star = fs.s3.file(fs.s3.state.join('state.sqlite3.tar.gz'));
    const shash = fs.s3.file(fs.s3.state.join('state.sha256'));

    if (!await fs.exists(local)) {
      log.error(`State database not found: ${ascii.red(local.url)}`);
      process.exit(1);
    }

    const localHash = await fs.sha256(local);

    const remoteHash = await fs.exists(shash)
      ? await fs.text(shash).then(s => s.trim())
      : undefined;

    if (!force && localHash === remoteHash) {
      log.notice('Remote state is already up to date');
      return;
    }

    log.debug('Compressing state database');
    await $`tar -zcf ${ltar.path} -C ${fs.dirname(local)} ${basename(local.path)}`.text();

    log.debug(`Uploading state database`);
    await fs.cp(ltar, star);

    log.debug('Uploading state hash');
    await fs.write(shash, localHash);

    log.debug('Deleting temporary files');
    await fs.rm(ltar);

    remoteHash
      ? log.info(`State database pushed to S3 (${ascii.red(remoteHash.slice(0, 8))} → ${ascii.green(localHash.slice(0, 8))})`)
      : log.info(`State database pushed to S3 (${ascii.green(localHash.slice(0, 8))})`);
  },
}));
