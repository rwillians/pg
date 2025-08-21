import { $command, $options } from '../commands';
import { Dump } from '../../db/dump';
import { s } from '../../utils';

const options = $options({
  id: {
    describe: 'The id of the dump to generate the download link for',
    type: 'number',
    demandOption: true,
  },
});

export const dumpLink = $command({
  signature: 'link <id>',
  describe: 'Generates a presigned download link for a dump file',
  builder: (cli) => cli.positional('id', options.id),
  handler: async (argv, ctx) => {
    const { id } = argv;
    const { db, logger, s3 } = ctx;

    const dump = await Dump.findOneById(db, id);

    if (!dump) {
      logger.error(`Dump ${s.red(id)} not found`)
      process.exit(1);
    }

    const file = s3.file(dump.path);

    console.log(file.presign({
      expiresIn: 3600,
      acl: 'public-read'
    }));
  },
});
