import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { start } from './cli/commands/start';
import { backupList } from './cli/commands/backup-list';
import { backupNew } from './cli/commands/backup-new';
import { backupRestore } from './cli/commands/backup-restore';
import { certsInstall } from './cli/commands/certs-install';
import { configList } from './cli/commands/config-list';
import { dumpDownload } from './cli/commands/dump-download';
import { dumpImport } from './cli/commands/dump-import';
import { dumpLink } from './cli/commands/dump-link';
import { dumpList } from './cli/commands/dump-list';
import { dumpNew } from './cli/commands/dump-new';
import { dumpRestore } from './cli/commands/dump-restore';
import { stateBackup } from './cli/commands/state-backup';
import { walArchive } from './cli/commands/wal-archive';
import { walStats } from './cli/commands/wal-stats';
import { walUnarchive } from './cli/commands/wal-unarchive';

const pg = yargs(hideBin(process.argv))
  .scriptName('pg')
  .version('0.2.0')
  .showHelpOnFail(false)
  .demandCommand(1)
  .strict();

pg.command(start());
pg.command('backup', 'Manage base backups', (cli) => cli
  .command(backupNew())
  .command(backupList())
  .command(backupRestore())
);
pg.command('certs', 'Manage TLS certificates', (cli) => cli
  .command(certsInstall())
);
pg.command('config', 'Manage configurations', (cli) => cli
  .command(configList())
);
pg.command('dump', 'Manage database dumps', (cli) => cli
  .command(dumpNew())
  .command(dumpImport())
  .command(dumpLink())
  .command(dumpList())
  .command(dumpDownload())
  .command(dumpRestore())
);
pg.command('state', 'Manage the cli internal state', (cli) => cli
  .command(stateBackup())
);
pg.command('wal', 'Manage WAL segment archives', (cli) => cli
  .command(walArchive())
  .command(walUnarchive())
  .command(walStats())
);

pg.parseAsync();
