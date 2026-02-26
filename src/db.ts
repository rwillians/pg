import { create } from '@rwillians/qx/experimental-migrations';
import * as sqlite from '@rwillians/qx/bun-sqlite';
import { archives } from './db/tables/archives';
import { backups } from './db/tables/backups';
import { createQxLogger } from './db/logger';
import { type Logger } from './logger';
import { type Config } from './config';
import { join } from 'node:path';

/**
 * @public  Connects to the database, returning a Database instance.
 * @since   18.0.0
 * @version 1
 */
export const connect = async (config: Config, logger: Logger) => sqlite
  .connect(join(config.PG_STATE_DIR, 'state.sqlite3'))
  .attachLogger(createQxLogger(logger));

/**
 * @public  The database instance type.
 * @since   18.0.0
 * @version 1
 */
export type Database = Awaited<ReturnType<typeof connect>>;

/**
 * @public  A registry of all database tables.
 * @since   18.0.0
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
export const migreate = async (db: Database, logger: Logger) => {
  logger.debug('running database migrations...');

  await create.table(archives, { ifNotExists: true }).onto(db);
  await create.table(backups, { ifNotExists: true }).onto(db);

  logger.debug('migrations complete');
};

export { expr, from, into } from '@rwillians/qx';
