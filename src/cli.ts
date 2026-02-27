import { version } from './pkg' with { type: 'macro' };
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';

import { walUnarchive } from './cli/cmds/wal-unarchive';
import { walArchive } from './cli/cmds/wal-archive';
import { debugBusy } from './cli/cmds/debug-busy';
import { genSecret } from './cli/cmds/gen-secret';
import { genSlug } from './cli/cmds/gen-slug';

const pg = yargs(hideBin(process.argv))
  .scriptName('pg')
  .version(version())
  .showHelpOnFail(false)
  .demandCommand(1)
  .strict();

pg.command('debug', 'Tools for debug (see subcommands)', cli => cli
  .command(debugBusy()),
);

pg.command('gen', 'Generate suff (see subcommands)', cli => cli
  .command(genSecret())
  .command(genSlug()),
);

pg.command('wal', 'WAL management (see subcommands)', cli => cli
  .command(walArchive())
  .command(walUnarchive()),
);

pg.parseAsync();
