import { connect as connectV1 } from '../../db-v1';
import { $command } from '../commands';
import { into } from '../../db';

import { Archive } from '../../db-v1/archive';
import { Backup } from '../../db-v1/backup';
import { Certs } from '../../db-v1/certs';
import { Dump } from '../../db-v1/dump';

import { archives } from '../../db/archives';
import { backups } from '../../db/backups';
import { certs } from '../../db/certs';
import { dumps } from '../../db/dumps';

export const stateImportV2 = $command({
  signature: 'import:v2',
  describe: 'Imports the data from db-v1 into db-v2',
  handler: async (_argv, ctx) => {
    const { config, db: db2, logger } = ctx;
    const db1 = await connectV1(config);

    logger.info('Importing data from db-v1 into db-v2...');

    logger.info('Importing archives...');
    for (const { id, ...rest } of await Archive.all(db1)) {
      await into(archives)
        .insert([rest])
        .run(db2);
    }

    logger.info('Importing backups...');
    for (const { id, ...rest } of await Backup.all(db1)) {
      await into(backups)
        .insert([rest])
        .run(db2);
    }

    logger.info('Importing certs...');
    for (const { id, ...rest } of await Certs.all(db1)) {
      await into(certs)
        .insert([rest])
        .run(db2);
    }

    logger.info('Importing dumps...');
    for (const { id, ...rest } of await Dump.all(db1)) {
      await into(dumps)
        .insert([rest])
        .run(db2);
    }

    logger.info('Done!');
  },
});
