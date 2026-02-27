import { tc } from '../custom-columns';
import { table } from '@rwillians/qx';

/**
 * @public Keeps track of all WAL files archived to S3.
 * @since  18.0.0
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
