import { defineCommand } from '../command';
import { inspect } from 'bun';

/**
 * @private Same as {@link inspect} but with hardcoded options.
 * @since   18.0.0
 * @version 1
 */
const i = (value: unknown) => inspect(value, { colors: true, compact: false, depth: Infinity, sorted: true });

export const debugDump = defineCommand({
  signature: 'dump',
  description: 'Dumps all environment variables for debugging purposes',
  handle: async () => process.stdout.write(i(process.env) + '\n'),
});
