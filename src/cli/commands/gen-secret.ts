import { defineCommand, defineOptions } from '../command';
import { gen } from '../../utils';

const options = defineOptions({
  length: {
    type: 'number',
    default: 32,
    description: 'The length of the generated secret',
  },
});

export const genSecret = defineCommand({
  signature: 'secret',
  description: 'Generates a URL-safe base64 strong secret',
  build: (cli) => cli.option('length', options.length),
  handle: async ({ length }) => console.log(gen.secret(length)),
});
