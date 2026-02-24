import { table } from '@rwillians/qx';

export const dumps = table('dumps', t => ({
  id: t.integer().autoincrement().primaryKey(),
  path: t.string(),
  size: t.integer(),
  startedAt: t.datetime(),
  completedAt: t.datetime(),
}));

export type Dump = typeof dumps.infer;
export type InsertDump = typeof dumps.inferForInsert;
export type UpdateDump = typeof dumps.inferForUpdate;
