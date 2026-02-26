import { table } from '@rwillians/qx';
import { tc } from '../utils';

/**
 * @public  Keeps track of all base backups uploaded to S3.
 * @since   18.0.0
 * @version 1
 */
export const backups = table('backups', t => ({
  id: t.integer().autoincrement().primaryKey(),
  parentId: t.integer().nullable(),
  tar: tc.absolutePath(),
  manifest: tc.absolutePath(),
  size: tc.bytesize(),
  startedAt: t.datetime(),
  completedAt: t.datetime(),
}));

export type Backup = typeof backups.infer;
export type InsertBackup = typeof backups.inferForInsert;
export type UpdateBackup = typeof backups.inferForUpdate;
