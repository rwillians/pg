import { create } from '@rwillians/qx/experimental-migrations';
import * as sqlite from '@rwillians/qx/bun-sqlite';
import { type Logger } from './logger';
import { type Config } from './config';
import { join } from 'node:path';

import { archives } from './db/tables/archives';
import { backups } from './db/tables/backups';

/**
 * @public Connects to the database, returning a Database instance.
 * @since  18.0.0
 */
export const connect = async (config: Config) => sqlite
  .connect(join(config.PG_STATE_DIR, 'state.sqlite3'));

/**
 * @public The database instance type.
 * @since  18.0.0
 */
export type Database = Awaited<ReturnType<typeof connect>>;

/**
 * @public Registry of all database tables.
 * @since  18.0.0
 */
export const tables = {
  /** @inheritdoc */
  archives,
  /** @inheritdoc */
  backups,
};

/**
 * @public  Runs database migrations.
 * @since   18.0.0
 * @version 1
 */
export const migrate = async (db: Database, logger: Logger) => {
  logger.debug('running database migrations...');

  await create.table(archives, { ifNotExists: true }).onto(db);
  await create.table(backups, { ifNotExists: true }).onto(db);

  logger.debug('migrations complete');
};

export { expr, from, into } from '@rwillians/qx';
