import { defineCommand } from '../command';
import { gen } from '../../utils';

export const genSlug = defineCommand({
  signature: 'slug',
  description: 'Generates a database slug',
  handle: async () => process.stdout.write(gen.slug() + '\n'),
});
