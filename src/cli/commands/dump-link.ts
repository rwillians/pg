import { $command, $options } from '../commands';
import { s } from '../../utils';

import { dumps } from '../../db-v2/dumps';
import { from } from '../../db-v2';

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

    const dump = await from(dumps)
      .where(c => c.eq(dumps.id, id))
      .one(db);

    if (!dump) {
      logger.error(`Dump ${s.red(id)} not found`)
      process.exit(1);
    }

    const file = s3.file(dump.path);

    console.log(file.presign({
      acl: 'public-read',
      expiresIn: 3600,
      method: 'GET',
    }));
  },
});
