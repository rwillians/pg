import type { Backup } from '../../db/tables/backups';
import { defineCommand, defineOptions, withContext } from '../cmd';
import { expr, from, tables } from '../../db';
import type { Context } from '../../context';
import { spawn } from 'node:child_process';
import { ascii } from '../../utils';
import { $, sleep } from 'bun';

const options = defineOptions({
  force: {
    describe: 'Skip the safety warning and proceed with the restore',
    type: 'boolean' as const,
    default: false,
  },
});

export const backupRestore = defineCommand(withContext({
  signature: 'restore <id>',
  description: 'Restores the database from a base backup',
  build: cli => cli
    .positional('id', { type: 'number', demandOption: true })
    .option('force', options.force),
  handle: async (argv, ctx) => {
    const { id, force } = argv;
    const { config, db, fs, log } = ctx;

    if (!config.PG_READONLY_MODE) {
      log.error('Restore can only run in read-only mode');
      log.error(`Set ${ascii.blue('PG_READONLY_MODE=true')} to enable it`);
      process.exit(1);
    }

    if (!force) {
      log.warning('This will delete all data in PGDATA and replace it with the backup');
      log.warning(`Run with ${ascii.red('--force')} to proceed`);
      process.exit(1);
    }

    const backup = await from(tables.backups.as('b'))
      .where(({ b }) => expr.eq(b.id, id))
      .one(db);

    if (!backup) {
      log.error(`Backup ${ascii.red(id!)} not found`);
      process.exit(1);
    }

    if (!backup.completedAt) {
      log.error(`Backup ${ascii.red(id!)} is incomplete`);
      process.exit(1);
    }

    const pgdata = config.PGDATA;
    const tmpdir = fs.local.temp.join('restore');

    await $`mkdir -p ${tmpdir}`;

    backup.parentId === null
      ? await restoreFull({ backup, ctx, pgdata, tmpdir })
      : await restoreIncremental({ backup, ctx, pgdata, tmpdir });

    // -- Recovery tail --

    log.debug('Creating recovery.signal');
    await $`touch ${pgdata}/recovery.signal`;

    log.debug('Starting PostgreSQL for recovery');
    const child = spawn('docker-entrypoint.sh', [
      'postgres',
      '-c', 'restore_command=pg wal unarchive -p %p -f %f',
    ], { stdio: 'inherit' });

    log.debug('Waiting for PostgreSQL to become ready');
    while (true) {
      const result = await $`pg_isready -U ${config.POSTGRES_USER} -d ${config.POSTGRES_DB}`.nothrow().quiet();
      if (result.exitCode === 0) break;
      await sleep(1000);
    }

    log.debug('Shutting down PostgreSQL');
    child.kill('SIGINT');
    await new Promise<void>(resolve => child.on('close', resolve));

    log.debug('Deleting temporary files');
    await $`rm -rf ${tmpdir}`;

    log.info(`Backup ${ascii.blue(id!)} restored successfully`);
  },
}));

//
//   PRIVATE
//

type RestoreArgs = {
  backup: Backup;
  ctx: Context;
  pgdata: string;
  tmpdir: string;
};

async function restoreFull({ backup, ctx, pgdata, tmpdir }: RestoreArgs) {
  const { fs, log } = ctx;
  const star = fs.s3.file(backup.tar);
  const ltar = fs.local.file(`${tmpdir}/base.tar.gz`);

  log.debug(`Downloading backup from ${ascii.blue(star.url)}`);
  await fs.cp(star, ltar);

  log.debug('Clearing PGDATA');
  await $`rm -rf ${pgdata}`;
  await $`mkdir -p ${pgdata}`;

  log.debug('Extracting backup');
  await $`tar xzf ${ltar.path} -C ${pgdata}`;
}

async function restoreIncremental({ backup, ctx, pgdata, tmpdir }: RestoreArgs) {
  const { db, fs, log } = ctx;
  // -- Walk the parentId chain to build the full chain --

  const chain: Backup[] = [backup];
  let current = backup;

  while (current.parentId !== null) {
    const parent = await from(tables.backups.as('b'))
      .where(({ b }) => expr.eq(b.id, current.parentId))
      .one(db);

    if (!parent) {
      log.error(`Parent backup ${ascii.red(current.parentId)} not found`);
      process.exit(1);
    }

    chain.push(parent);
    current = parent;
  }

  // Reverse so the full backup is first, then incrementals in order
  chain.reverse();

  log.debug(`Restore chain: ${chain.map(b => b.id).join(' -> ')}`);

  // -- Download and extract each backup in the chain --

  const dirs: string[] = [];

  for (const entry of chain) {
    const dir = `${tmpdir}/${entry.id}`;
    dirs.push(dir);

    await $`mkdir -p ${dir}`;

    const star = fs.s3.file(entry.tar);
    const ltar = fs.local.file(`${dir}/base.tar.gz`);

    log.debug(`Downloading backup ${ascii.blue(entry.id)} from ${ascii.blue(star.url)}`);
    await fs.cp(star, ltar);

    log.debug(`Extracting backup ${ascii.blue(entry.id)}`);
    await $`tar xzf ${ltar.path} -C ${dir}`;

    const sman = fs.s3.file(entry.manifest);
    const lman = fs.local.file(`${dir}/backup_manifest`);

    log.debug(`Downloading manifest for backup ${ascii.blue(entry.id)}`);
    await fs.cp(sman, lman);
  }

  // -- Combine backups --

  log.debug('Clearing PGDATA');
  await $`rm -rf ${pgdata}`;
  await $`mkdir -p ${pgdata}`;

  log.debug('Combining backups with pg_combinebackup');
  await $`pg_combinebackup ${dirs} -o ${pgdata}`;
}
