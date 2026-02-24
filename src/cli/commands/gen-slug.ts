import { defineCommand } from '../command';
import { gen } from '../../utils';

export const genSlug = defineCommand({
  signature: 'slug',
  description: 'Generates a database slug',
  handle: async () => console.log(gen.slug()),
});
