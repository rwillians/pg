import { withContext, defineCommand, defineOptions } from '../command';
import { ReadOnlyError } from '../../errors';
import { into, tables } from '../../db';
import { $, randomUUIDv7 } from 'bun';
import { ascii } from '../../utils';

const options = defineOptions({
  fast: {
    describe: 'Triggers a fast checkpoint on Postgres',
    type: 'boolean',
    default: false,
  },
});

export const backupNew = defineCommand(withContext({
  signature: 'new',
  description: 'Creates a new full base backup',
  build: cli => cli
    .option('fast', options.fast),
  handle: async (argv, ctx) => {
    const { fast } = argv;
    const { config, db, fs, log } = ctx;

    if (config.PG_READONLY_MODE) {
      throw new ReadOnlyError('create base backup');
    }

    const startedAt = new Date();
    const label = randomUUIDv7();
    const dir = fs.local.temp.join(`backup-${label}`);

    log.info('Starting full base backup');

    if (fast) {
      await $`pg_basebackup -D ${dir} -c fast -P`;
    } else {
      await $`pg_basebackup -D ${dir} -P`;
    }

    const completedAt = new Date();
    const ltar = fs.local.temp.file(`backup-${label}.tar.gz`);
    const lman = fs.local.temp.file(`backup-${label}.manifest`);
    const star = fs.s3.backups.file(`backup-${label}.tar.gz`);
    const sman = fs.s3.backups.file(`backup-${label}.manifest`);

    log.debug('Extracting backup manifest');
    await $`cp ${dir}/backup_manifest ${lman.path}`.text();

    log.debug('Compressing backup');
    await $`tar -zcf ${ltar.path} -C ${dir} .`.text();
    const size = await fs.size(ltar);

    log.debug('Uploading backup to S3');
    await fs.cp(ltar, star);
    await fs.cp(lman, sman);

    log.debug('Updating internal state');
    await into(tables.backups)
      .values([{
        parentId: null,
        tar: star.path,
        manifest: sman.path,
        size,
        startedAt,
        completedAt,
      }])
      .insert(db);

    log.debug('Cleaning up temporary files');
    await $`rm -rf ${dir}`.text();
    await fs.rm(ltar);
    await fs.rm(lman);

    log.info(`Full base backup ${ascii.blue(label)} uploaded to S3`);
  },
}));
