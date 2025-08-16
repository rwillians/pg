import { basename } from 'node:path';
import { $command, $options } from '../commands';
import { Dump } from '../../db/dump';
import { s } from '../../utils';

const options = $options({
  id: {
    describe: 'The id of the dump to download',
    type: 'number',
    demandOption: true,
  },
});

export const dumpDownload = $command({
  signature: 'download <id>',
  describe: 'Downloads a dump from S3 into the current directory',
  builder: (cli) => cli.positional('id', options.id),
  handler: async (argv, ctx) => {
    const { id } = argv;
    const { db, logger, s3 } = ctx;

    const dump = await Dump.findOneById(db, id);

    if (!dump) {
      logger.error(`Dump ${s.red(id)} not found`)
      process.exit(1);
    }

    const remoteFile = s3.file(dump.path);
    const remoteUrl = `s3://${remoteFile.name}`;

    if (!await remoteFile.exists()) {
      logger.error(`Dump file not found: ${s.red(remoteUrl)}`);
      process.exit(1);
    }

    const localPath = `./${basename(dump.path)}`;
    const localFile = Bun.file(localPath);

    logger.info(`Downloading dump ${s.blue(dump.id)} from ${remoteUrl}`);
    await Bun.write(localFile, remoteFile);

    logger.info(`Dump ${s.blue(dump.id)} downloaded successfully to ${s.green(localPath)}`);
  },
});
