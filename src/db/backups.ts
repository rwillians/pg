import { table } from '@rwillians/qx';

export const backups = table('backups', t => ({
  id: t.integer().autoincrement().primaryKey(),
  parentId: t.integer().nullable(),
  tar: t.string(),
  manifest: t.string(),
  size: t.integer(),
  startedAt: t.datetime(),
  completedAt: t.datetime(),
}));

export type Backup = typeof backups.infer;
export type InsertBackup = typeof backups.inferForInsert;
export type UpdateBackup = typeof backups.inferForUpdate;
