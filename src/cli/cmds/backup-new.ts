import { defineCommand, defineOptions, withContext } from '../cmd';
import { expr, from, into, tables } from '../../db';
import { ascii, fmt } from '../../utils';
import { randomUUIDv7 } from 'bun';
import { $ } from 'bun';

const options = defineOptions({
  incremental: {
    describe: 'Create an incremental backup based on the most recent backup',
    type: 'boolean' as const,
    default: false,
    alias: 'i',
  },
  fast: {
    describe: 'Request a fast checkpoint',
    type: 'boolean' as const,
    default: false,
  },
});

export const backupNew = defineCommand(withContext({
  signature: 'new',
  description: 'Creates a new base backup and uploads it to S3',
  build: cli => cli
    .option('incremental', options.incremental)
    .option('fast', options.fast),
  handle: async (argv, ctx) => {
    const { incremental, fast } = argv;
    const { config, db, fs, log, notify } = ctx;

    if (config.PG_READONLY_MODE) {
      log.error('Cannot create backup in read-only mode');
      process.exit(1);
    }

    const label = randomUUIDv7();
    const startedAt = new Date();
    const tmpdir = fs.local.temp.join(label);

    log.info(`Starting ${incremental ? 'incremental' : 'full'} backup ${ascii.blue(label)}`);

    // -- Find parent backup if incremental --

    let parentId: number | null = null;
    let manifestPath: string | undefined;

    if (incremental) {
      const parent = await from(tables.backups.as('b'))
        .where(({ b }) => expr.isNot(b.completedAt, null))
        .orderBy(({ b }) => [expr.desc(b.completedAt)])
        .limit(1)
        .one(db);

      if (!parent) {
        log.error('No previous backup found for incremental backup');
        process.exit(1);
      }

      parentId = parent.id;
      const sman = fs.s3.file(parent.manifest);
      const lman = fs.local.file(fs.local.temp.join(`${label}.parent.manifest`));

      log.debug(`Downloading parent manifest from ${ascii.blue(sman.url)}`);
      await fs.cp(sman, lman);
      manifestPath = lman.path;
    }

    // -- Run pg_basebackup --

    await $`mkdir -p ${tmpdir}`;

    const user = config.POSTGRES_USER;

    const pgbb =
      incremental && fast ? $`pg_basebackup -U ${user} -D ${tmpdir} -Ft -z -P --incremental ${manifestPath} -c fast`
    : incremental         ? $`pg_basebackup -U ${user} -D ${tmpdir} -Ft -z -P --incremental ${manifestPath}`
    : fast                ? $`pg_basebackup -U ${user} -D ${tmpdir} -Ft -z -P -c fast`
    : $`pg_basebackup -U ${user} -D ${tmpdir} -Ft -z -P`;

    log.debug('Running pg_basebackup');
    await pgbb;

    // -- Upload to S3 --

    const ltar = fs.local.file(`${tmpdir}/base.tar.gz`);
    const lman = fs.local.file(`${tmpdir}/backup_manifest`);
    const star = fs.s3.file(fs.s3.backups.join(`${label}.tar.gz`));
    const sman = fs.s3.file(fs.s3.backups.join(`${label}.manifest`));
    const size = await fs.size(ltar);

    log.debug(`Uploading backup ${ascii.blue(label)} to S3`);
    await fs.cp(ltar, star);
    await fs.cp(lman, sman);

    // -- Record in state --

    log.debug('Updating internal state');
    const [backup] = await into(tables.backups)
      .values([{
        parentId,
        tar: star.path,
        manifest: sman.path,
        size,
        startedAt,
        completedAt: new Date(),
      }])
      .insert(db);

    // -- Cleanup --

    log.debug('Deleting temporary files');
    await $`rm -rf ${tmpdir}`.text();
    if (manifestPath) await fs.rm(fs.local.file(manifestPath));

    log.info(`Backup ${ascii.blue(label)} completed (${fmt.size(size)})`);

    // -- Notify --

    await notify({ kind: 'backup-completed', backup: backup! });
  },
}));
