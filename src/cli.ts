import { version } from './pkg' with { type: 'macro' };
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';

import { archiveDownload } from './cli/cmds/archive-download';
import { archivePrune } from './cli/cmds/archive-prune';
import { archiveStats } from './cli/cmds/archive-stats';
import { archiveUpload } from './cli/cmds/archive-upload';
import { backupLs } from './cli/cmds/backup-ls';
import { backupNew } from './cli/cmds/backup-new';
import { backupPrune } from './cli/cmds/backup-prune';
import { backupRestore } from './cli/cmds/backup-restore';
import { backupStats } from './cli/cmds/backup-stats';
import { debugBusy } from './cli/cmds/debug-busy';
import { genSecret } from './cli/cmds/gen-secret';
import { genSlug } from './cli/cmds/gen-slug';
import { notificationTest } from './cli/cmds/notification-test';
import { scheduler } from './cli/cmds/scheduler';
import { start } from './cli/cmds/start';
import { statePull } from './cli/cmds/state-pull';
import { statePush } from './cli/cmds/state-push';
import { systemConfig } from './cli/cmds/system-config';
import { systemPrune } from './cli/cmds/system-prune';

const pg = yargs(hideBin(process.argv))
  .scriptName('pg')
  .version(version())
  .showHelpOnFail(false)
  .demandCommand(1)
  .strict();

pg.command('archive', 'Manage archived files (see subcommands)', cli => cli
  .command(archiveDownload())
  .command(archivePrune())
  .command(archiveStats())
  .command(archiveUpload()),
);

pg.command('backup', 'Manage base backups (see subcommands)', cli => cli
  .command(backupLs())
  .command(backupNew())
  .command(backupPrune())
  .command(backupRestore())
  .command(backupStats()),
);

pg.command('debug', 'Debug tools (see subcommands)', cli => cli
  .command(debugBusy()),
);

pg.command('gen', 'Commands for generating random values (see subcommands)', cli => cli
  .command(genSecret())
  .command(genSlug()),
);

pg.command('notification', 'Notification-related utilities (see subcommands)', cli => cli
  .command(notificationTest()),
);

pg.command('state', 'Manage state database (see subcommands)', cli => cli
  .command(statePull())
  .command(statePush()),
);

pg.command(scheduler());
pg.command(start());

pg.command('system', 'System commands (see subcommands)', cli => cli
  .command(systemConfig())
  .command(systemPrune()),
);

pg.parseAsync();
