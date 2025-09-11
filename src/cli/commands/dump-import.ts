import { statSync } from 'node:fs';
import { randomUUIDv7 } from 'bun';
import { $command, $options } from '../commands';
import { s } from '../../utils';

import { dumps } from '../../db/dumps';
import { into } from '../../db';

const options = $options({
  file: {
    describe: 'The path to the dump file',
    type: 'string',
    demandOption: true,
  },
});

export const dumpImport = $command({
  signature: 'import <file>',
  describe: 'Imports a dump file into S3 and creates a new Dump record in the internal state',
  builder: (cli) => cli.positional('file', options.file),
  handler: async (argv, ctx) => {
    const { file } = argv;
    const { config, db, logger, s3 } = ctx;

    const localFile = Bun.file(file);

    if (!await localFile.exists()) {
      logger.error(`Dump file not found: ${s.red(file)}`);
      process.exit(1);
    }

    logger.info(`Importing dump from file ${s.blue(file)}`);
    const id = randomUUIDv7();
    const remotePath = `${config.S3_DUMPS_PREFIX}/${id}.dump`;
    const remoteFile = s3.file(remotePath);

    logger.debug(`Uploading dump to S3`);
    const start = performance.now();
    await Bun.write(remoteFile, localFile);
    const elapsed = Math.round((performance.now() - start) / 1000);

    logger.debug(`Updating internal state`);
    const now = new Date();

    const [dump] = await into(dumps)
      .insert([{ path: remotePath, size: statSync(file).size, startedAt: now, completedAt: now }])
      .run(db);

    if (!dump) {
      logger.error(`Failed to create dump record in the database`);
      return process.exit(1);
    }

    logger.info(`Dump ${s.blue(dump.id)} created successfully! Took ${elapsed}s`)
  },
});
