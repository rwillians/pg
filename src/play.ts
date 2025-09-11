import { inspect } from 'node:util';
import { z } from 'zod/v4';

import {
  type SQLiteSortDirection,
  type Table,
  type Column,
  type Expr,
  type Stats,
  // type Expand,
  NAME,
  criteria,
  render,
  connect,
  type Database,
} from './db';

import { parseConfig } from './config';
import { backups } from './db/backups';
import { createLogger } from './logger';





type Aliased<T, S extends string = string> = { alias: S, value: T };
// const aliased = <T, S extends string>(table: T, alias: S) => ({ alias, value: table } satisfies Aliased<T, S>);

const SQLiteJoin = {
  JOIN: 'JOIN',
  LEFT_JOIN: 'LEFT JOIN',
  OUTER_JOIN: 'OUTER JOIN',
  LEFT_OUTER_JOIN: 'LEFT OUTER JOIN',
  INNER_JOIN: 'INNER JOIN',
  CROSS_JOIN: 'CROSS JOIN',
} as const;

type SQLiteJoin = typeof SQLiteJoin;
type Param = string | number | boolean | null;

type TablesMapping = { [alias: string]: Table };
type Join = { type: SQLiteJoin[keyof SQLiteJoin], table: Table, alias: string, on: Expr };
type Selection = { [k: string]: Column };

// const registerTable = <
//   T extends TablesMapping,
//   S extends Aliased<Table>,
// >(mapping: T, ref: S) => {
//   // >(mapping: T, ref: S): readonly [T & { [k in S['alias']]: S['value'] }, Aliased<Table, S['alias']>] => {
//   const { alias, value: table } = ref;

//   if (mapping[alias]) {
//     throw new Error(`Table alias "${alias}" is already in use, please specify a different alias.`);
//   }

//   const { [NAME]: name, ...rest } = table;

//   const aliasedColumns = Object.fromEntries(
//     Object
//       .values(rest)
//       // ↓ modify the column so its name is prefixed by the table alias
//       .map(col => [col.field, { ...col, name: `${alias}."${col.name}"` }] as const),
//   );

//   const tableWithAliasedColumns = { [NAME]: name, ...aliasedColumns };

//   return [
//     { ...mapping, [alias]: tableWithAliasedColumns },
//     { alias, value: tableWithAliasedColumns },
//   ] as const;
// };

type Query = {
  mapping: TablesMapping;
  selection: Selection;
  from: Aliased<Table>;
  joins: Join[];
  where?: Expr;
  orderBy: [Expr, SQLiteSortDirection][];
  limit?: number;
  offset?: number;
};

const renderQuery = (q: Query) => {
  const qfrags = ['SELECT'];
  const qparams: Param[] = [];

  // SELECT clause
  const sfrags: string[] = [];
  const parsers: { [k: string]: (value: any) => any } = {};

  // if (q.selection === '*') {
  //   //                 ↑ by default we'll select only the FROM table's
  //   //                   columns

  //   const { [NAME]: _name, ...cols } = q.from.value;

  //   for (const col of Object.values(cols)) {
  //     sfrags.push(`${col.alias} AS "${col.field}"`);
  //     parsers[col.field] = (value: any) => col.schema.parse(value === null ? null : col.codec.decode(value));
  //   }

  //   qfrags.push(sfrags.join(', '));
  // } else {
  //   for (const [alias, col] of Object.entries(q.selection)) {
  //     sfrags.push(`${col.alias} AS "${alias}"`);
  //     parsers[alias] = (value: any) => col.schema.parse(value === null ? null : col.codec.decode(value));
  //   }
  // }

  for (const [alias, col] of Object.entries(q.selection)) {
    sfrags.push(`${col.alias} AS "${alias}"`);
    parsers[alias] = (value: any) => col.schema.parse(value === null ? null : col.codec.decode(value));
  }

  qfrags.push(sfrags.join(', '));

  // FROM clause
  qfrags.push('FROM', q.from.value[NAME], 'AS', `"${q.from.alias}"`);

  // JOIN clauses
  for (const j of q.joins) {
    const [jsql, jparams] = render.any(j.on);

    qfrags.push(j.type, j.table[NAME], 'AS', j.alias, 'ON', jsql);
    qparams.push(...jparams);
  }

  // WHERE clause
  if (q.where) {
    const [wsql, wparams] = render.any(q.where);
    qfrags.push('WHERE', wsql);
    qparams.push(...wparams);
  }

  // ORDER BY clause
  if (q.orderBy.length > 0) {
    const obfrags: string[] = [];

    for (const [expr, dir] of q.orderBy) {
      const [esql, eparams] = render.any(expr);
      obfrags.push(`${esql} ${dir}`);
      qparams.push(...eparams);
    }

    qfrags.push('ORDER BY', obfrags.join(', '));
  }

  // GROUP BY clause
  // HAVING clause

  // LIMIT clause
  if (q.limit !== undefined) {
    qfrags.push('LIMIT', '?');
    qparams.push(~~q.limit);
  }

  // OFFSET clause
  if (q.offset !== undefined) {
    qfrags.push('OFFSET', '?');
    qparams.push(~~q.offset);
  }

  // Row parser
  const parser = (row: any) => Object.fromEntries(
    Object
      .entries(row)
      .map(([k, v]) => [k, parsers[k]!(v)] as const),
  );

  return [qfrags.join(' ') + ';', qparams, parser] as const;
};

type PutAliasedTable<T extends TablesMapping, S extends Aliased<Table>> = T & { [k in S['alias']]: S['value'] };

const $register = <
  T extends TablesMapping,
  S extends Aliased<Table>,
>(mapping: T, ref: S): readonly [T & { [k in S['alias']]: S['value'] }, Aliased<Table, S['alias']>] => {
  const { alias, value: table } = ref;

  if (mapping[alias]) {
    throw new Error(`Table alias "${alias}" is already in use, please specify a different alias.`);
  }

  const { [NAME]: name, ...rest } = table;

  const aliasedColumns = Object.fromEntries(
    Object
      .values(rest)
      // ↓ modify the column so its name is prefixed by the table alias
      .map(col => [col.field, { ...col, alias: `${alias}."${col.name}"` }] as const),
  );

  const tableWithAliasedColumns = { [NAME]: name, ...aliasedColumns };

  return [
    { ...mapping, [alias]: tableWithAliasedColumns },
    { alias, value: tableWithAliasedColumns },
  ] as const;
};

class QueryBuilder<M extends TablesMapping, F extends Aliased<Table>, S extends Selection> {
  #mapping: M;
  #selection: S;
  #from: F;
  #joins: Join[] = [];
  #where?: Expr;
  #orderBy: [Expr, SQLiteSortDirection][] = [];
  #limit?: number;
  #offset?: number;

  constructor(mapping: M, from: F, selection: S) {
    this.#mapping = mapping;
    this.#selection = selection;
    this.#from = from;
  }

  static from<T extends Table, A extends string>(table: T, { as: alias }: { as: A }) {
    let mapping: TablesMapping = {};
    let from: Aliased<Table>;

    [mapping, from] = $register(mapping, { alias, value: table });
    const { [NAME]: _name, ...cols } = from.value;

    return new QueryBuilder(
      mapping as { [k in A]: T },
      from as Aliased<T, A>,
      cols as { [K in keyof T as K extends string ? K : never]: T[K] },
    );
  }

  select<U extends Selection>(fn: (m: M) => U) {
    const q = new QueryBuilder(this.#mapping, this.#from, fn(this.#mapping));

    q.#joins = [...this.#joins];
    q.#where = this.#where;
    q.#orderBy = [...this.#orderBy];
    q.#limit = this.#limit;
    q.#offset = this.#offset;

    return q;
  }

  leftJoin<T extends Table, A extends string>(
    table: T,
    alias: A,
    on: (c: typeof criteria, m: PutAliasedTable<M, Aliased<T, A>>) => Expr,
  ) {
    return this.__join(SQLiteJoin.LEFT_JOIN, table, alias, on);
  }

  innerJoin<T extends Table, A extends string>(
    table: T,
    alias: A,
    on: (c: typeof criteria, m: PutAliasedTable<M, Aliased<T, A>>) => Expr,
  ) {
    return this.__join(SQLiteJoin.INNER_JOIN, table, alias, on);
  }

  where(fn: (c: typeof criteria, m: M) => Expr) {
    this.#where = fn(criteria, this.#mapping);
    return this;
  }

  orderBy<U extends [Expr, SQLiteSortDirection]>(fn: (m: M) => U[]) {
    this.#orderBy = fn(this.#mapping);
    return this;
  }

  limit(n: number) {
    this.#limit = ~~n; // ← truncate to integer
    return this;
  }

  offset(n: number) {
    this.#offset = ~~n; // ← truncate to integer
    return this;
  }

  inspect(fnOrDb: Database | ((sql: string, params: Param[]) => any)) {
    const [sql, params] = renderQuery({
      mapping: this.#mapping,
      selection: this.#selection!,
      from: this.#from!,
      joins: this.#joins,
      where: this.#where,
      orderBy: this.#orderBy,
      limit: this.#limit,
      offset: this.#offset,
    });

    typeof fnOrDb === 'function'
      ? fnOrDb(sql, params)
      : fnOrDb.logger.debug(`${sql} ${inspect(params)}`);

    return this;
  }

  async all(db: Database) {
    const [sql, params, parse] = renderQuery({
      mapping: this.#mapping,
      selection: this.#selection!,
      from: this.#from!,
      joins: this.#joins,
      where: this.#where,
      orderBy: this.#orderBy,
      limit: this.#limit,
      offset: this.#offset,
    });

    const query = db.prepare(sql);
    const stats: { db: Stats, parse: Stats } = { db: {}, parse: {} };

    stats.db.start = performance.now();
    const results = query.all(...params);
    stats.db.end = performance.now();
    stats.db.elapsed = (stats.db.end! - stats.db.start!);

    stats.parse.start = performance.now();
    const rows = results.map(parse);
    stats.parse.end = performance.now();
    stats.parse.elapsed = (stats.parse.end! - stats.parse.start!);

    db.logger.debug(`[SQLite] [db=${stats.db.elapsed.toFixed(2)}ms parse=${stats.parse.elapsed.toFixed(2)}ms] ${sql} ${inspect(params)}`);

    return rows as { [K in keyof S]: z.infer<S[K]['schema']> }[];
  }

  async one(db: Database) {
    return (await this.__clone().limit(1).all(db))[0] || null;
  }

  //
  //    PRIVATE
  //

  private __join<
    T extends SQLiteJoin[keyof SQLiteJoin],
    U extends Table,
    A extends string,
  >(type: T, table: U, alias: A, on: (c: typeof criteria, m: PutAliasedTable<M, Aliased<U, A>>) => Expr) {
    let aliasedTable: Table;

    [
      this.#mapping,
      { value: aliasedTable },
    ] = $register(this.#mapping, { alias, value: table });

    this.#joins.push({
      type,
      table: aliasedTable,
      alias,
      on: on(criteria, this.#mapping as PutAliasedTable<M, Aliased<U, A>>),
    });

    return this as unknown as QueryBuilder<PutAliasedTable<M, Aliased<U, A>>, F, S>;
  }

  private __clone() {
    const q = new QueryBuilder(this.#mapping, this.#from, this.#selection);

    q.#selection = this.#selection;
    q.#from = this.#from;
    q.#joins = [...this.#joins];
    q.#where = this.#where;
    q.#orderBy = [...this.#orderBy];
    q.#limit = this.#limit;
    q.#offset = this.#offset;

    return q;
  }
}

(async () => {
  const config = parseConfig(process.env);
  const logger = createLogger({ level: config.PG_LOG_LEVEL, silent: config.PG_SILENT });
  const db = await connect(`${config.PG_STATE_DIR}/db.sqlite`, logger);

  const results =
    await QueryBuilder
      .from(backups, { as: 'b1' })
      // .innerJoin(backups, 'b2', (c, { b1, b2 }) => c.eq(b2.id, b1.parentId))
      .leftJoin(backups, 'b2', (c, { b1, b2 }) => c.and([c.eq(b2.id, b1.parentId), c.lt(b2.startedAt, new Date())]))
      .where((c, { b1 }) => c.eq(b1.parentId, null))
      .orderBy(({ b1 }) => [[b1.completedAt, 'DESC']])
      // .limit(1)
      // .offset(0)
      // .select(({ b1 }) => ({
      //   id: b1.id,
      //   parentId: b1.parentId,
      // }))
      .all(db);

  console.log('ROWS', results)
})();
