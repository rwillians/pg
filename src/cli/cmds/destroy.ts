import { defineCommand, defineOptions, withContext } from '../cmd';
import { ascii, fmt, never } from '../../utils';
import { from, tables } from '../../db';
import { $ } from 'bun';

const options = defineOptions({
  force: {
    describe: 'Skip the safety warning and proceed with the destruction',
    type: 'boolean' as const,
    default: false,
  },
});

export const destroy = defineCommand(withContext({
  signature: 'destroy',
  description: 'Destroys all backups, WAL archives, the state database, and the data directory',
  build: cli => cli
    .option('force', options.force),
  handle: async (argv, ctx) => {
    const { force } = argv;
    const { config, db, fs, log } = ctx;

    if (!force) {
      log.warning('This will permanently delete all backups, WAL archives, the state database, and the data directory');
      log.warning(`Run with ${ascii.red('--force')} to proceed`);
      process.exit(1);
    }

    const backups = await from(tables.backups.as('b')).all(db);
    const archives = await from(tables.archives.as('a')).all(db);

    let reclaimed = 0;

    for (let i = 0; i < backups.length; i++) {
      const backup = backups[i] ?? never();
      process.stdout.write(`\rDeleting backup ${i + 1}/${backups.length}...`);
      await fs.rm(fs.s3.file(backup.tar));
      await fs.rm(fs.s3.file(backup.manifest));
      reclaimed += backup.size;
    }

    if (backups.length > 0) process.stdout.write('\n');
    log.info(`Deleted ${backups.length} backup(s)`);

    for (let i = 0; i < archives.length; i++) {
      const archive = archives[i] ?? never();
      process.stdout.write(`\rDeleting archive ${i + 1}/${archives.length}...`);
      await fs.rm(fs.s3.file(archive.tar));
      reclaimed += archive.size;
    }

    if (archives.length > 0) process.stdout.write('\n');
    log.info(`Deleted ${archives.length} archive(s)`);

    await fs.rm(fs.s3.file(fs.s3.state.join('state.sqlite3.tar.gz')));
    await fs.rm(fs.s3.file(fs.s3.state.join('state.sha256')));
    await fs.rm(fs.local.file(fs.local.state.join('state.sqlite3')));

    log.info('Deleted state database');

    await $`rm -rf ${config.PGDATA}`;
    log.info('Deleted data directory');

    log.info(`Reclaimed ${fmt.size(reclaimed)}`);
  },
}));
