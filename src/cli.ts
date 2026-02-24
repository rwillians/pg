import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { pkg } from './pkg' with { type: 'macro' };

import { genSecret } from './cli/commands/gen-secret';

const pg = yargs(hideBin(process.argv))
  .scriptName('pg')
  .version(pkg().version)
  .showHelpOnFail(false)
  .demandCommand(1)
  .strict();

pg.command('gen', 'Generators', (cli) => cli
  .command(genSecret())
);

pg.parseAsync();
