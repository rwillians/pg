import { statSync } from 'node:fs';
import { randomUUIDv7 } from 'bun';
import { $command, $options } from '../commands';
import { loadState } from '../../state';
import { s } from '../../utils';

const options = $options({
  file: {
    describe: 'The path to the dump file',
    type: 'string',
    demandOption: true,
  },
});

export const importDump = $command({
  signature: 'dump:import <file>',
  describe: 'Imports a dump file into S3 and creates a new Dump record in the internal state',
  builder: (cli) => cli.positional('file', options.file),
  handler: async (argv, ctx) => {
    const { file } = argv;
    const { config, logger, s3 } = ctx;

    const localFile = Bun.file(file);

    if (!await localFile.exists()) {
      logger.error(`Dump file not found: ${s.red(file)}`);
      process.exit(1);
    }

    logger.info(`Importing dump from file ${s.blue(file)}`);
    const id = randomUUIDv7();
    const remotePath = `${config.PG_DUMPS_DIR}/${id}.dump`;
    const remoteFile = s3.file(remotePath);

    logger.debug(`Uploading dump to S3`);
    const start = performance.now();
    await Bun.write(remoteFile, localFile);
    const elapsed = Math.round((performance.now() - start) / 1000);

    logger.debug(`Updating internal state`);
    const state = await loadState(ctx);
    const dump = await state.dumps.create({
      tar: remotePath,
      size: statSync(file).size,
      startedAt: new Date(),
      completedAt: new Date(),
    });

    logger.info(`Dump ${s.blue(dump.id)} created successfully! Took ${elapsed}s`)
  },
});
