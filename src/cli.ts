import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { pkg } from './pkg' with { type: 'macro' };

import { genSecret } from './cli/commands/gen-secret';
import { genSlug } from './cli/commands/gen-slug';

const pg = yargs(hideBin(process.argv))
  .scriptName('pg')
  .version(pkg().version)
  .showHelpOnFail(false)
  .demandCommand(1)
  .strict();

pg.command('gen', 'Generator commands', (cli) => cli
  .command(genSecret())
  .command(genSlug())
);

pg.parseAsync();
