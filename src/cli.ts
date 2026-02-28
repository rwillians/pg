import { version } from './pkg' with { type: 'macro' };
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';

import { backupLs } from './cli/cmds/backup-ls';
import { backupNew } from './cli/cmds/backup-new';
import { backupRestore } from './cli/cmds/backup-restore';
import { backupStats } from './cli/cmds/backup-stats';
import { configLs } from './cli/cmds/config-ls';
import { debugBusy } from './cli/cmds/debug-busy';
import { genSecret } from './cli/cmds/gen-secret';
import { genSlug } from './cli/cmds/gen-slug';
import { scheduler } from './cli/cmds/scheduler';
import { start } from './cli/cmds/start';
import { statePull } from './cli/cmds/state-pull';
import { statePush } from './cli/cmds/state-push';
import { walArchive } from './cli/cmds/wal-archive';
import { walPrune } from './cli/cmds/wal-prune';
import { walStats } from './cli/cmds/wal-stats';
import { walUnarchive } from './cli/cmds/wal-unarchive';

const pg = yargs(hideBin(process.argv))
  .scriptName('pg')
  .version(version())
  .showHelpOnFail(false)
  .demandCommand(1)
  .strict();

pg.command('backup', 'Backup management (see subcommands)', cli => cli
  .command(backupLs())
  .command(backupNew())
  .command(backupRestore())
  .command(backupStats()),
);

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
  .command(walPrune())
  .command(walStats()),
);

pg.command('state', 'State management (see subcommands)', cli => cli
  .command(statePush())
  .command(statePull()),
);

pg.command(scheduler());
pg.command(start());

pg.parseAsync();
