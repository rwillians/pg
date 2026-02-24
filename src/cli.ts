import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { version } from './pkg' with { type: 'macro' };

const pg = yargs(hideBin(process.argv))
  .scriptName('pg')
  .version(version())
  .showHelpOnFail(false)
  .demandCommand(1)
  .strict();

pg.parseAsync();
