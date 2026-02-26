import { withContext, defineCommand, defineOptions } from '../command';
import { from, expr, into, tables } from '../../db';
import type { Context } from '../../context';
import { ReadOnlyError } from '../../errors';
import { $, randomUUIDv7 } from 'bun';
import { ascii } from '../../utils';

const options = defineOptions({
  fast: {
    describe: 'Triggers a fast checkpoint on Postgres',
    type: 'boolean',
    default: false,
  },
  incremental: {
    describe: 'Creates an incremental backup based on the latest existing backup',
    type: 'boolean',
    default: false,
    alias: 'i',
  },
});

const findPreviousBackup = async ({ db, log }: Context) => {
  log.debug('Fetching latest backup');
  return from(tables.backups.as('b'))
    .orderBy(({ b }) => [expr.desc(b.completedAt)])
    .limit(1)
    .one(db);
};

export const backupNew = defineCommand(withContext({
  signature: 'new',
  description: 'Creates a new base backup',
  build: cli => cli
    .option('fast', options.fast)
    .option('incremental', options.incremental),
  handle: async (argv, ctx) => {
    const { fast, incremental } = argv;
    const { config, db, fs, log } = ctx;

    if (config.PG_READONLY_MODE) {
      throw new ReadOnlyError('create base backup');
    }

    const previousBackup = incremental
      ? await findPreviousBackup(ctx)
      : null;

    if (incremental && previousBackup === null) {
      throw new Error('No previous backup found, cannot create incremental backup');
    }

    const label = randomUUIDv7();
    const ldir = fs.local.temp.join(`backup-${label}`);

    const lpman = previousBackup
      ? fs.local.temp.file(`${label}-parent.manifest`)
      : null;

    if (previousBackup && lpman) {
      const spman = fs.s3.file(previousBackup.manifest);

      log.debug('Downloading parent backup manifest from S3');
      await fs.cp(spman, lpman);
    }

    const type = incremental ? 'Incremental' : 'Full';
    log.info(`Starting ${type.toLowerCase()} base backup`);

    const startedAt = new Date();

      lpman && fast ? await $`pg_basebackup -D ${ldir} --incremental ${lpman} -c fast -P`
    : lpman         ? await $`pg_basebackup -D ${ldir} --incremental ${lpman} -P`
    : fast          ? await $`pg_basebackup -D ${ldir} -c fast -P`
    : await $`pg_basebackup -D ${ldir} -P`;

    const completedAt = new Date();

    const ltar = fs.local.temp.file(`backup-${label}.tar.gz`);
    const lman = fs.local.temp.file(`backup-${label}.manifest`);
    const star = fs.s3.backups.file(`${label}.tar.gz`);
    const sman = fs.s3.backups.file(`${label}.manifest`);

    log.debug('Extracting backup manifest');
    await $`cp ${ldir}/backup_manifest ${lman.path}`.text();

    log.debug('Compressing backup');
    await $`tar -zcf ${ltar.path} -C ${ldir} .`.text();
    const size = await fs.size(ltar);

    log.debug('Uploading backup to S3');
    await fs.cp(ltar, star);
    await fs.cp(lman, sman);

    log.debug('Updating internal state');
    const [backup] = await into(tables.backups)
      .values([{
        parentId: previousBackup?.id,
        tar: star.path,
        manifest: sman.path,
        size,
        startedAt,
        completedAt,
      }])
      .insert(db);

    log.debug('Cleaning up temporary files');
    await $`rm -rf ${ldir}`.text();
    await fs.rm(ltar);
    await fs.rm(lman);
    if (lpman) await $`rm ${lpman}`.text();

    log.info(`${type} base backup ${ascii.blue(backup!.id)} uploaded to S3`);
  },
}));
