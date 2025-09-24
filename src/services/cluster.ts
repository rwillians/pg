import { type IDatabase, ex, from, into } from '@rwillians/sqlity';
import { kv } from '../db/kv';

/**
 * @public  Manages the cluster slug.
 * @since   0.3.0
 * @version 0.3.0
 */
export const slug = {
  /**
   * @public  Upserts the cluster slug.
   * @since   0.3.0
   * @version 0.3.0
   */
  set: async (db: IDatabase, value: string) => {
    await into(kv)
      .upsert([{ key: 'clusterSlug', value }])
      .run(db);

    return value;
  },
  /**
   * @public  Get's the cluster slug.
   * @since   0.3.0
   * @version 0.3.0
   */
  get: async (db: IDatabase) => from(kv.as('r'))
    .where(({ r }) => ex.eq(r.key, 'clusterSlug'))
    .one(db)
    .then((row) => row?.value ?? null as string | null),
};
