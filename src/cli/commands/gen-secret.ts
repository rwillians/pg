import { defineCommand, defineOptions } from '../command';
import { gen } from '../../utils';

const options = defineOptions({
  length: {
    type: 'number',
    default: 64,
    description: 'The desired secret length (in characters)',
  },
});

export const genSecret = defineCommand({
  signature: 'secret',
  description: 'Generates a URL-safe base64 strong secret',
  build: (cli) => cli.option('length', options.length),
  handle: async (argv) => process.stdout.write(gen.secret(argv.length) + '\n'),
});
