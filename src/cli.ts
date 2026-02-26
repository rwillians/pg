import { version } from './utils/pkg' with { type: 'macro' };
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';

import { debugBusy } from './cli/commands/debug-busy';
import { debugDump } from './cli/commands/debug-dump';
import { genSecret } from './cli/commands/gen-secret';
import { genSlug } from './cli/commands/gen-slug';
import { postgresStart } from './cli/commands/postgres-start';
import { walArchive } from './cli/commands/wal-archive';
import { walUnarchive } from './cli/commands/wal-unarchive';

const pg = yargs(hideBin(process.argv))
  .scriptName('pg')
  .version(version())
  .showHelpOnFail(false)
  .demandCommand(1)
  .strict();

pg.command('debug', 'Debugging tools (has subcommands', cli => cli
  .command(debugBusy())
  .command(debugDump())
);

pg.command('gen', 'Generators (has subcommands)', cli => cli
  .command(genSecret())
  .command(genSlug())
);

pg.command('postgres', 'Manage the PostgreSQL server (has subcommands)', cli => cli
  .command(postgresStart())
);

pg.command('wal', 'Execute operations on WAL segments (has subcommands)', cli => cli
  .command(walArchive())
  .command(walUnarchive())
);

pg.parseAsync();
