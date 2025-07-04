import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { start } from './cli/commands/start';
import { archive } from './cli/commands/archive';
import { unarchive } from './cli/commands/unarchive';
import { createBackup } from './cli/commands/backup-create';
import { listBackups } from './cli/commands/backup-list';
import { restoreBackup } from './cli/commands/backup-restore';
import { createDump } from './cli/commands/dump-create';
import { importDump } from './cli/commands/dump-import';
import { listDumps } from './cli/commands/dump-list';
import { downloadDump } from './cli/commands/dump-download';
import { restoreDump } from './cli/commands/dump-restore';
import { installCerts } from './cli/commands/certs-install';
import { rotateCerts } from './cli/commands/certs-rotate';
import { listConfigs } from './cli/commands/config-list';

const cli = yargs(hideBin(process.argv))
  .scriptName('pg')
  .version('0.1.0')
  .showHelpOnFail(false)
  .demandCommand(1)
  .strict();

cli.command(start());
cli.command(archive());
cli.command(unarchive());
cli.command(createBackup());
cli.command(listBackups());
cli.command(restoreBackup());
cli.command(createDump());
cli.command(importDump());
cli.command(listDumps());
cli.command(downloadDump());
cli.command(restoreDump());
cli.command(installCerts());
cli.command(rotateCerts());
cli.command(listConfigs());

cli.parseAsync();
