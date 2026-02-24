import { table } from '@rwillians/qx';

export const archives = table('archives', t => ({
  id: t.integer().autoincrement().primaryKey(),
  tar: t.string(),
  size: t.integer(),
  createdAt: t.datetime(),
}));

export type Archive = typeof archives.infer;
export type InsertArchive = typeof archives.inferForInsert;
export type UpdateArchive = typeof archives.inferForUpdate;
