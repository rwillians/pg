import { defineCommand } from '../command';

export const debugDump = defineCommand({
  signature: 'dump',
  description: 'Dumps all environment variables for debugging purposes',
  handle: async () => {
    console.log(process.env);
  },
});
