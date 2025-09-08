import { connect as connectV1 } from '../../db-v1';
import { $command } from '../commands';
import { into } from '../../db-v2';
import { s } from '../../utils';

import { Archive } from '../../db-v1/archive';
import { Backup } from '../../db-v1/backup';
import { Certs } from '../../db-v1/certs';
import { Dump } from '../../db-v1/dump';

import { archives } from '../../db-v2/archives';
import { backups } from '../../db-v2/backups';
import { certs } from '../../db-v2/certs';
import { dumps } from '../../db-v2/dumps';

export const stateImportV2 = $command({
  signature: 'import:v2',
  describe: 'Imports the data from db-v1 into db-v2',
  handler: async (_argv, ctx) => {
    const { config, db: db2, logger } = ctx;
    const db1 = await connectV1(config);

    logger.info('Importing data from db-v1 into db-v2...');

    logger.info('Importing archives...');
    for (const { id, ...rest } of await Archive.all(db1)) {
      const [archive] = await into(archives).insert([rest]).run(db2);
      logger.debug(`Archive imported ${s.red(id)} ${s.blue(archive!.id)}`)
    }

    logger.info('Importing backups...');
    for (const { id, ...rest } of await Backup.all(db1)) {
      const [archive] = await into(backups).insert([rest]).run(db2);
      logger.debug(`Backup imported ${s.red(id)} ${s.blue(archive!.id)}`)
    }

    logger.info('Importing certs...');
    for (const { id, ...rest } of await Certs.all(db1)) {
      const [archive] = await into(certs).insert([rest]).run(db2);
      logger.debug(`Cert imported ${s.red(id)} ${s.blue(archive!.id)}`)
    }

    logger.info('Importing dumps...');
    for (const { id, ...rest } of await Dump.all(db1)) {
      const [archive] = await into(dumps).insert([rest]).run(db2);
      logger.debug(`Dump imported ${s.red(id)} ${s.blue(archive!.id)}`)
    }

    logger.info('Done!');
  },
});
