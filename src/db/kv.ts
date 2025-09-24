import { t, table } from '@rwillians/sqlity';

/**
 * A simple key-value table for storing state.
 */
export const kv = table('kv', {
  key: t.primaryKey(t.text()),
  value: t.json(),
});
