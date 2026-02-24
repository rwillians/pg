import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { pkg } from './pkg' with { type: 'macro' };

import { genSecret } from './cli/commands/gen-secret';
import { genSlug } from './cli/commands/gen-slug';
import { certsInstall } from './cli/commands/certs-install';

const pg = yargs(hideBin(process.argv))
  .scriptName('pg')
  .version(pkg().version)
  .showHelpOnFail(false)
  .demandCommand(1)
  .strict();

pg.command('certs', 'Manage TLS certificates', (cli) => cli
  .command(certsInstall())
);

pg.command('gen', 'Generator commands', (cli) => cli
  .command(genSecret())
  .command(genSlug())
);

pg.parseAsync();
