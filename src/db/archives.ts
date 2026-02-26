import { table } from '@rwillians/qx';
import { tc } from '../utils';

/**
 * @public  Keeps track of all WAL files archived to S3.
 * @since   18.0.0
 * @version 1
 */
export const archives = table('archives', t => ({
  id: t.integer().autoincrement().primaryKey(),
  tar: tc.absolutePath(),
  size: tc.bytesize(),
  createdAt: t.datetime(),
}));

export type Archive = typeof archives.infer;
export type InsertArchive = typeof archives.inferForInsert;
export type UpdateArchive = typeof archives.inferForUpdate;
