import { defineCommand, defineOptions, withContext } from '../cmd';
import { ascii } from '../../utils';
import { $ } from 'bun';

const options = defineOptions({
  force: {
    describe: 'Pull even if state is already up to date',
    type: 'boolean' as const,
    default: false,
  },
});

export const statePull = defineCommand(withContext({
  signature: 'pull',
  description: 'Downloads the state database from S3',
  build: cli => cli
    .option('force', options.force),
  handle: async (argv, ctx) => {
    const { force } = argv;
    const { fs, log } = ctx;

    const local = fs.local.file(fs.local.state.join('state.sqlite3'));
    const star = fs.s3.file(fs.s3.state.join('state.sqlite3.tar.gz'));
    const shash = fs.s3.file(fs.s3.state.join('state.sha256'));
    const ltar = fs.local.file(fs.local.temp.join('state.sqlite3.tar.gz'));

    if (!await fs.exists(shash)) {
      log.error('No state found on S3');
      process.exit(1);
    }

    if (!force && await fs.exists(local)) {
      const remoteHash = (await fs.text(shash)).trim();
      const localHash = await fs.sha256(local);

      if (localHash === remoteHash) {
        log.notice('Local state is already up to date');
        return;
      }
    }

    if (!await fs.exists(star)) {
      log.error(`State database not found on S3: ${ascii.red(star.url)}`);
      process.exit(1);
    }

    log.debug('Downloading state database from S3');
    await fs.cp(star, ltar);

    log.debug('Decompressing state database');
    await $`tar -zxf ${ltar.path} -C ${fs.dirname(local)}`.text();

    log.debug('Deleting temporary files');
    await fs.rm(ltar);

    log.info('State database pulled from S3');
  },
}));
