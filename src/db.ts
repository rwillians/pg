import { create } from '@rwillians/qx/experimental-migrations';
import * as sqlite from '@rwillians/qx/bun-sqlite';
import { join } from 'node:path';

import { type Logger, createQxLogger } from './logger';
import { type Config } from './config';

import { archives } from './db/archives';
import { backups } from './db/backups';

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
