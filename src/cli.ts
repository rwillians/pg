import { version } from './pkg' with { type: 'macro' };
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';

import { walUnarchive } from './cli/cmds/wal-unarchive';
import { walArchive } from './cli/cmds/wal-archive';
import { backupStats } from './cli/cmds/backup-stats';
import { backupNew } from './cli/cmds/backup-new';
import { debugBusy } from './cli/cmds/debug-busy';
import { genSecret } from './cli/cmds/gen-secret';
import { statePush } from './cli/cmds/state-push';
import { statePull } from './cli/cmds/state-pull';
import { configLs } from './cli/cmds/config-ls';
import { walStats } from './cli/cmds/wal-stats';
import { backupLs } from './cli/cmds/backup-ls';
import { genSlug } from './cli/cmds/gen-slug';

const pg = yargs(hideBin(process.argv))
  .scriptName('pg')
  .version(version())
  .showHelpOnFail(false)
  .demandCommand(1)
  .strict();

pg.command('config', 'Configuration management (see subcommands)', cli => cli
  .command(configLs()),
);

pg.command('debug', 'Tools for debug (see subcommands)', cli => cli
  .command(debugBusy()),
);

pg.command('gen', 'Generate suff (see subcommands)', cli => cli
  .command(genSecret())
  .command(genSlug()),
);

pg.command('wal', 'WAL management (see subcommands)', cli => cli
  .command(walArchive())
  .command(walUnarchive())
  .command(walStats()),
);

pg.command('backup', 'Backup management (see subcommands)', cli => cli
  .command(backupNew())
  .command(backupLs())
  .command(backupStats()),
);

pg.command('state', 'State management (see subcommands)', cli => cli
  .command(statePush())
  .command(statePull()),
);

pg.parseAsync();
