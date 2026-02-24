import * as sqlite from '@rwillians/qx/bun-sqlite';
import { create } from '@rwillians/qx/experimental-migrations';
import { join } from 'node:path';

import type { Config } from './config';
import { archives } from './db/archives';
import { backups } from './db/backups';
import { certs } from './db/certs';
import { dumps } from './db/dumps';

export const connect = (config: Config) => sqlite.connect(join(config.PG_STATE_DIR, 'state.sqlite3'));

export type Database = ReturnType<typeof connect>;

export const tables = {
  archives,
  backups,
  certs,
  dumps,
};

export const setup = async (db: Database) => {
  await create.table(archives, { ifNotExists: true }).onto(db);
  await create.table(backups, { ifNotExists: true }).onto(db);
  await create.table(certs, { ifNotExists: true }).onto(db);
  await create.table(dumps, { ifNotExists: true }).onto(db);
};
