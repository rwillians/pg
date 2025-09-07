import { isAbsolute } from 'node:path';
import { Database } from 'bun:sqlite';
import { z } from 'zod/v4';

//////////////////////////////////////////////////////////////////////
///                            SYMBOLS                             ///
//////////////////////////////////////////////////////////////////////

/**
 * The name of the key in Table that stores the table name.
 */
const NAME = Symbol.for('~name');

//////////////////////////////////////////////////////////////////////
///                         PRIVATE TYPES                          ///
//////////////////////////////////////////////////////////////////////

/**
 * @private
 *
 * Data types supported by SQLite.
 */
type SQLiteDataType = 'BLOB' | 'INTEGER' | 'REAL' | 'TEXT' | `VARCHAR(${number})`;

/**
 * @private
 *
 * Sort directions supported in SQLite queries.
 */
type SQLiteSortDirection = 'ASC' | 'DESC';

/**
 * @private
 *
 * Forces TypeScript to expand/resolve a complex object type.
 */
type Expand<T> = T extends object ? { [K in keyof T]: T[K] } : T;

//////////////////////////////////////////////////////////////////////
///                          PUBLIC TYPES                          ///
//////////////////////////////////////////////////////////////////////

/**
 * @public
 *
 * A codec knows how to encode data to be persisted in the database
 * and how to decode it when reading from the database. For example, a
 * boolean needs to be persisted as a `0` or `1` in SQLite.
 */
export type Codec<A = any, B = any> = {
  // ↓ encode it to the value used in the database (e.g. boolean -> 0/1)
  encode: (value: A) => B;
  // ↓ decode it from the value in the database (e.g. 0/1 -> boolean)
  decode: (value: B) => A;
};

/**
 * @public
 *
 * The shape of a column that's passed to {@link table} function.
 */
export type ColumnShape = {
  schema: z.ZodType;
  type: SQLiteDataType;
  codec: Codec;
  primaryKey?: true;
  autoincrement?: true;
  nullable?: true;
  unique?: true;
};

/**
 * @public
 *
 * The complete shape of a column that's part of a {@link Table}.
 */
export type Column<T extends ColumnShape = ColumnShape> = T & {
  name: string;  // ← name in the database
  field: string; // ← name in the code
};

/**
 * @public
 *
 * The basic shape of a table as it's passed to {@link table} function.
 */
export type TableShape = {
  [column: string]: ColumnShape;
};

/**
 * @public
 *
 * The complete shape of a table.
 */
export type Table<T extends TableShape = TableShape> = {
  readonly [NAME]: string;
} & {
  [K in keyof T]: Column<T[K]>;
};

/**
 * @public
 *
 * Infers the type of a row in the table, with all its columns.
 */
export type InferRow<T extends Table> = {
  [K in keyof T & string]: z.infer<T[K]['schema']>;
};

/**
 * @private
 *
 * Infers the shape of a row to be inserted into a table.
 *
 * This differs from {@link InferRow} in that it excludes
 * generated columns such as the auto-incrementing ones.
 */
export type InferRowForInsert<T extends Table> = {
  [K in keyof T & string as T[K] extends { autoincrement: true } ? never : K]: z.infer<T[K]['schema']>;
};

/**
 * @private
 *
 * Infers the shape of a table's row with only the given selected
 * columns.
 */
type InferSelected<T extends Table, S extends Column[]> = {
  [K in keyof T & string as K extends S[number]['field'] ? K : never]: z.infer<T[K]['schema']>
};

/**
 * @private
 *
 * Equal expression.
 */
type ExprEq = { lhs: Expr, op: '=', rhs: Expr };

/**
 * @private
 *
 * Not equal expression.
 */
type ExprNeq = { lhs: Expr, op: '!=', rhs: Expr };

/**
 * @private
 *
 * Less than expression.
 */
type ExprLt = { lhs: Expr, op: '<', rhs: Expr };

/**
 * @private
 *
 * Less than or equal to expression.
 */
type ExprLte = { lhs: Expr, op: '<=', rhs: Expr };

/**
 * @private
 *
 * Greater than expression.
 */
type ExprGt = { lhs: Expr, op: '>', rhs: Expr };

/**
 * @private
 *
 * Greater than or equal to expression.
 */
type ExprGte = { lhs: Expr, op: '>=', rhs: Expr };

/**
 * @private
 *
 * Like expression.
 */
type ExprLike = { lhs: Expr, op: 'LIKE', rhs: Expr };

/**
 * @private
 *
 * In expression.
 */
type ExprIn = { lhs: Expr, op: 'IN', rhs: Expr };

/**
 * @private
 *
 * And expression.
 */
type ExprAnd = { and: Expr[] };

/**
 * @private
 *
 * Or expression.
 */
type ExprOr = { or: Expr[] };

/**
 * @private
 *
 * Not expression.
 */
type ExprNot = { not: Expr };

/**
 * @private
 *
 * Literal value expression.
 */
type ExprLiteral = any;

/**
 * @private
 *
 * All where clause expressions supported.
 */
type Expr =
  Column
  | ExprEq
  | ExprNeq
  | ExprLt
  | ExprLte
  | ExprGt
  | ExprGte
  | ExprLike
  | ExprIn
  | ExprAnd
  | ExprOr
  | ExprNot
  | ExprLiteral;

/**
 * @private
 *
 * All binary expression types.
 */
type ExprBinary =
  ExprEq
  | ExprNeq
  | ExprLt
  | ExprLte
  | ExprGt
  | ExprGte
  | ExprLike
  | ExprIn;

/**
 * @private
 *
 * Query type.
 */
type Query = {
  table: Table;
  selection: Column[];
  where?: Expr;
  orderBy: [Column, SQLiteSortDirection][];
  limit?: number;
  offset?: number;
};

//////////////////////////////////////////////////////////////////////
///                            HELPERS                             ///
//////////////////////////////////////////////////////////////////////

/**
 * @private
 *
 * Removing the given trailing character from a string, if it exists.
 */
const removeTrailing = (char: string) => (str: string) => str.endsWith(char)
  ? str.slice(0, (char.length * -1))
  : str;

/**
 * @private
 *
 * Rounds a number to a given precision.
 */
const round = (num: number, precision: number) => Math.round(num * (10 ** precision)) / (10 ** precision);

/**
 * @private
 *
 * Turns camelCase into snake_case.
 */
const snake = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

/**
 * @private
 *
 * Puts the name and field into a {@link ColumnShape}, turning it into
 * a {@link Column}.
 */
const named = <T extends ColumnShape, S extends string>(col: T, field: S) => ({
  ...col,
  name: snake(field),
  field,
}) satisfies Column<T>;

/**
 * @private
 *
 * Renders the SQL for a column on create table.
 */
const renderColumn = (col: Column) => {
  const {
    name,
    type,
    primaryKey = false,
    autoincrement = false,
    nullable = false,
    unique = false,
  } = col;

  const frags: string[] = [name, type];

  if (primaryKey) frags.push('PRIMARY KEY ASC');
  if (autoincrement) frags.push('AUTOINCREMENT');
  if (primaryKey) return frags.join(' ');

  if (!nullable) frags.push('NOT NULL');
  if (unique) frags.push('UNIQUE');

  return frags.join(' ');
};

/**
 * @private
 *
 * Renders the SQL for creating a table.
 */
const renderTable = (table: Table) => {
  const { [NAME]: name, ...cols } = table;

  const columns = Object
    .values(cols)
    .map(renderColumn)
    .join(', ');

  return `CREATE TABLE IF NOT EXISTS ${name} (${columns});`;
};

/**
 * @private
 *
 * Encodes a row to be inserted into the database.
 */
const createEncoderForInsert = (cols: Column[]) => (row: Record<string, any>) => {
  const frags: string[] = [];
  const params: (string | number | null)[] = [];

  for (const col of cols) {
    const value = row[col.field] ?? null;
    frags.push('?');
    params.push(value === null ? null : col.codec.encode(value));
  }

  return ['(' + frags.join(', ') + ')', params] as const;
};

/**
 * @private
 *
 * Decodes a row comming from the database.
 */
const createDecoder = (cols: Column[]) => (row: any) => {
  const data: Record<string, any> = {};

  for (const col of cols) {
    const value = row[col.name] ?? null;

    data[col.field] = value === null
      ? null
      : col.codec.decode(value);
  }

  return data;
};

/**
 * @private
 *
 * Condition builders.
 */
const criteria = {
  eq: (lhs: Expr, rhs: Expr) => ({ lhs, op: '=', rhs } as ExprEq),
  neq: (lhs: Expr, rhs: Expr) => ({ lhs, op: '!=', rhs } as ExprNeq),
  lt: (lhs: Expr, rhs: Expr) => ({ lhs, op: '<', rhs } as ExprLt),
  lte: (lhs: Expr, rhs: Expr) => ({ lhs, op: '<=', rhs } as ExprLte),
  gt: (lhs: Expr, rhs: Expr) => ({ lhs, op: '>', rhs } as ExprGt),
  gte: (lhs: Expr, rhs: Expr) => ({ lhs, op: '>=', rhs } as ExprGte),
  like: (lhs: Expr, rhs: Expr) => ({ lhs, op: 'LIKE', rhs } as ExprLike),
  in: (lhs: Expr, rhs: Expr[]) => ({ lhs, op: 'IN', rhs } as ExprIn),
  and: (exprs: Expr[]) => ({ and: exprs } as ExprAnd),
  or: (exprs: Expr[]) => ({ or: exprs } as ExprOr),
  not: (expr: Expr) => ({ not: expr } as ExprNot),
};

/**
 * @private
 *
 * Narrows an expression type.
 */
const is = {
  column: (expr: Expr): expr is Column => (expr as any).type && (expr as any).schema,
  eq: (expr: Expr): expr is ExprEq => (expr as any).op === '=',
  neq: (expr: Expr): expr is ExprNeq => (expr as any).op === '!=',
  lt: (expr: Expr): expr is ExprLt => (expr as any).op === '<',
  lte: (expr: Expr): expr is ExprLte => (expr as any).op === '<=',
  gt: (expr: Expr): expr is ExprGt => (expr as any).op === '>',
  gte: (expr: Expr): expr is ExprGte => (expr as any).op === '>=',
  like: (expr: Expr): expr is ExprLike => (expr as any).op === 'LIKE',
  in: (expr: Expr): expr is ExprIn => (expr as any).op === 'IN',
  and: (expr: Expr): expr is ExprAnd => Array.isArray((expr as any).and),
  or: (expr: Expr): expr is ExprOr => Array.isArray((expr as any).or),
  not: (expr: Expr): expr is ExprNot => !!(expr as any).not,
};

/**
 * @private
 *
 * Renders where clause expressions to SQL.
 */
const render = {
  any: (expr: Expr) => {
    if (is.column(expr)) return render.column(expr);
    if (is.eq(expr)) return render.binary(expr);
    if (is.neq(expr)) return render.binary(expr);
    if (is.lt(expr)) return render.binary(expr);
    if (is.lte(expr)) return render.binary(expr);
    if (is.gt(expr)) return render.binary(expr);
    if (is.gte(expr)) return render.binary(expr);
    if (is.like(expr)) return render.binary(expr);
    if (is.in(expr)) return render.binary(expr);
    if (is.and(expr)) return render.and(expr);
    if (is.or(expr)) return render.or(expr);
    if (is.not(expr)) return render.not(expr);
    return render.literal(expr);
  },
  and: ({ and: exprs }: ExprAnd) => {
    const frags: string[] = [];
    const params: (string | number | null)[] = [];

    for (const expr of exprs) {
      const [frag, p] = render.any(expr) as [string, (string | number | null)[]];
      frags.push(frag);
      params.push(...p);
    }

    return [`(${frags.join(' AND ')})`, params] as const;
  },
  binary: (expr: ExprBinary) => {
    const [lfrag, lparams] = render.any(expr.lhs) as [string, (string | number | null)[]];
    const [rfrag, rparams] = render.any(expr.rhs) as [string, (string | number | null)[]];

    return [`(${lfrag} ${expr.op} ${rfrag})`, [...lparams, ...rparams]] as const;
  },
  column: (col: Column) => [`"${col.name}"`, []] as const,
  literal: (value: any) => {
    if (value === null) return ['?', ['NULL']] as const;
    if (typeof value === 'number') return ['?', [value]] as const;
    if (typeof [value] === 'string') return ['?', [value]] as const;
    if (typeof value === 'boolean') return ['?', [value ? 1 : 0]] as const;
    if (value instanceof Date) return ['?', [value.valueOf()]] as const;
    if (Array.isArray(value)) return ['(' + value.map(() => '?').join(', ') + ')', value] as const;
    throw new Error(`cannot render literal of type ${typeof value}`);
  },
  not: ({ not: expr }: ExprNot) => {
    const [frag, params] = render.any(expr) as [string, (string | number | null)[]];
    return [`(NOT ${frag})`, params] as const;
  },
  or: ({ or: exprs }: ExprOr) => {
    const frags: string[] = [];
    const params: (string | number | null)[] = [];

    for (const expr of exprs) {
      const [frag, p] = render.any(expr) as [string, (string | number | null)[]];
      frags.push(frag);
      params.push(...p);
    }

    return [`(${frags.join(' OR ')})`, params] as const;
  },
};

/**
 * @private
*
* Statement builders.
*/
const statement = {
  /**
   * Generates an insert statement from the given table and rows.
   */
  insert: (table: Table, rows: Record<string, any>[]) => {
    const { [NAME]: name, ...rest } = table;

    const iparams: (string | number | null)[] = [];
    //   ↑ [i]nsert statement [params]
    const ifrags: string[] = ['INSERT INTO', name];
    //    ↑ [i]nsert statement [frag]ment[s]
    const vfrags: string[] = [];
    //    ↑ [v]alues [frag]ment[s]
    const rcols = Object.values(rest);
    //    ↑ [r]eturning [col]umn[s]
    const icols: Column[] = rcols.filter(col => !col.autoincrement);
    //    ↑ [i]nsert [col]umn[s]

    ifrags.push('(' + icols.map(col => col.name).join(', ') + ')');
    ifrags.push('VALUES');

    for (const [rfrag, rparams] of rows.map(createEncoderForInsert(icols))) {
      vfrags.push(rfrag);
      iparams.push(...rparams);
    }

    ifrags.push(vfrags.join(', '));
    ifrags.push('RETURNING');
    ifrags.push(rcols.map(col => col.name).join(', '));

    const decode = createDecoder(rcols);
    const schema = z.strictObject(Object.fromEntries(rcols.map(col => [col.field, col.schema]))).array();

    /**
     * Decodes and validates the rows returned from the insert statement.
     */
    const parse = (rows: any[]) => schema.parse(rows.map(decode));

    return [ifrags.join(' ') + ';', iparams, parse] as const;
  },
  /**
   * Generates a query statement.
   */
  query: (query: Query) => {
    const params: (string | number | null)[] = [];
    const frags: string[] = ['SELECT'];

    frags.push(query.selection.map(col => `"${col.name}"`).join(', '));
    frags.push('FROM', query.table[NAME]);

    if (query.where) {
      const [wfrag, wparams] = render.any(query.where);
      frags.push('WHERE', wfrag);
      params.push(...wparams);
    }

    if (query.orderBy.length > 0) {
      frags.push('ORDER BY');
      frags.push(query.orderBy.map(([col, dir]) => `"${col.name}" ${dir}`).join(', '));
    }

    if (query.limit || query.limit === 0) {
      frags.push('LIMIT', '?');
      params.push(query.limit);
    }

    if (query.offset || query.offset === 0) {
      frags.push('OFFSET', '?');
      params.push(query.offset);
    }

    const decode = createDecoder(query.selection);
    const schema = z.strictObject(Object.fromEntries(query.selection.map(col => [col.field, col.schema]))).array();

    /**
     * Decodes and validates the rows returned from the query statement.
     */
    const parse = (rows: any[]) => schema.parse(rows.map(decode));

    return [frags.join(' ') + ';', params, parse] as const;
  },
};

/**
 * @private
 *
 * Query builder.
 */
class QueryBuilder<T extends Table, S extends Column[]> {
  #table: T;
  #selection: S;
  #where?: Expr;
  #orderBy: [Column, SQLiteSortDirection][] = [];
  #limit?: number;
  #offset?: number;

  constructor(table: T, selection: S) {
    this.#table = table;
    this.#selection = selection;
  }

  select<C extends Column[]>(cols: C): QueryBuilder<T, C> {
    const q = new QueryBuilder(this.#table, cols);

    q.#where = this.#where;
    q.#orderBy = this.#orderBy;
    q.#limit = this.#limit;
    q.#offset = this.#offset;

    return q;
  }

  where(fn: (c: typeof criteria) => Expr): this {
    this.#where = fn(criteria);
    return this;
  }

  orderBy<O extends [Column, SQLiteSortDirection]>(sort: O[]): this {
    this.#orderBy = sort;
    return this;
  }

  limit(limit: number): this {
    this.#limit = limit;
    return this;
  }

  offset(offset: number): this {
    this.#offset = offset;
    return this;
  }

  inspect(): this {
    const [sql, params] = statement.query({
      table: this.#table,
      selection: this.#selection,
      where: this.#where,
      orderBy: this.#orderBy,
      limit: this.#limit,
      offset: this.#offset,
    });

    console.log('[DEBUG]', sql, params);

    return this;
  }

  async run(db: Database) {
    const [sql, params, parse] = statement.query({
      table: this.#table,
      selection: this.#selection,
      where: this.#where,
      orderBy: this.#orderBy,
      limit: this.#limit,
      offset: this.#offset,
    });

    const results = db.prepare(sql).all(...params);

    return parse(results) as Expand<InferSelected<T, S>>[];
  }
}

//////////////////////////////////////////////////////////////////////
///                           PUBLIC API                           ///
//////////////////////////////////////////////////////////////////////

/**
 * @public
 *
 * Built-in codecs for common types.
 */
export const codec = {
  boolean: () => ({
    encode: (value: boolean) => (value ? 1 : 0),
    decode: (value: number) => value === 1,
  }) satisfies Codec<boolean, number>,
  datetime: () => ({
    encode: (value: Date) => value.valueOf(),
    decode: (value: number) => new Date(value),
  }) satisfies Codec<Date, number>,
  real: (precision: number) => ({
    encode: (value: number) => round(value, precision),
    decode: (value: number) => value,
  }) satisfies Codec<number, number>,
  noop: <T extends any>() => ({
    encode: (value: T): T => value,
    decode: (value: T): T => value,
  }) satisfies Codec<T, T>,
} as const;

/**
 * @public
 *
 * Column types and modifiers.
 */
export const t = {
  /**
   * @public
   *
   * Defines an id column, which are normalized to be auto-incrementing
   * positive integers.
   */
  id: () => ({
    type: 'INTEGER',
    schema: z.coerce.number().int().positive(),
    codec: codec.noop<number>(),
    primaryKey: true,
    autoincrement: true,
  }) satisfies ColumnShape,
  /**
   * Defines a foreign key column, which are normalized to be positive
   * integers.
   */
  fk: () => ({
    type: 'INTEGER',
    schema: z.coerce.number().int().positive(),
    codec: codec.noop<number>(),
  }) satisfies ColumnShape,
  /**
   * Makes a column nullable.
   */
  nullable: <T extends ColumnShape>(shape: T) => ({
    ...shape,
    schema: shape.schema.nullable().default(null),
    nullable: true,
  }) satisfies T & { nullable: true },
  /**
   * Defines a blob column.
   */
  blob: () => ({
    type: 'BLOB',
    schema: z.instanceof(Uint8Array),
    codec: codec.noop<Uint8Array>(),
  }) satisfies ColumnShape,
  /**
   * Defines a date-time column, which are stored as milliseconds
   * integer.
   */
  datetime: () => ({
    type: 'INTEGER',
    schema: z.coerce.date(),
    codec: codec.datetime(),
  }) satisfies ColumnShape,
  /**
   * Defines an integer column, can optionally constrain the min and
   * the max value. Negative integers are not allowed, if you need it
   * then use `t.real()` instead.
   */
  integer: ({ min = 0, max = Number.MAX_SAFE_INTEGER }: { min?: number, max?: number } = {}) => ({
    type: 'INTEGER',
    schema: z.int().min(min).max(max),
    codec: codec.noop<number>(),
  }) satisfies ColumnShape,
  /**
   * Defines a column that accepts any number, can optionally
   * define the precision (decimal digits - defaults to 8).
   */
  real: ({ precision = 8 }: { precision?: number } = {}) => ({
    type: 'REAL',
    schema: z.number(),
    codec: codec.real(precision),
  }) satisfies ColumnShape,
  /**
   * Defines a string column, can optionally specify the max length
   * (up to 255). If you need to store more than 255 characters, then
   * use `t.text()` instead.
   *
   * Empty string is not allowed, define a nullable columns instead.
   */
  string: (len: number = 255) => ({
    type: `VARCHAR(${len})`,
    schema: z.string().min(1).max(len),
    codec: codec.noop<string>(),
  }) satisfies ColumnShape,
  /**
   * Defines a text column, which can store strings of any length.
   *
   * Empty string is not allowed, define a nullable columns instead.
   */
  text: () => ({
    type: 'TEXT',
    schema: z.string().min(1, { error: 'cannot be empty' }),
    codec: codec.noop<string>(),
  }) satisfies ColumnShape,
  /**
   * Custom types.
   */
  custom: {
    /**
     * Defines a column that can store absolute file system paths.
     */
    absolutePath: () => ({
      type: 'VARCHAR(255)',
      schema: z
        .string()
        .min(1, { error: 'cannot be empty' })
        .max(255, { error: 'cannot be more than 255 characters' })
        .refine(isAbsolute, { error: 'must be an absolute path' })
        .transform(removeTrailing('/')),
      codec: codec.noop<string>(),
    }) satisfies ColumnShape,
    /**
     * Defines a column that stores the size of a file or directory in
     * bytes.
     */
    bytes: () => ({
      type: 'INTEGER',
      schema: z.int().nonnegative(),
      codec: codec.noop<number>(),
    }) satisfies ColumnShape,
  } as const,
} as const;

/**
 * @public
 *
 * Stablishes a "connection" to a SQLite database, creating its file
 * in case it doesn't exist yet.
 */
export const connect = async (path: string) => {
  const file = Bun.file(path);
  if (!await file.exists()) await file.write('');

  return new Database(path);
};

/**
 * @public
 *
 * Creates the given tables in the database in case they don't exist
 * already.
 */
export const setup = async (db: Database, tables: Table[]) => {
  for (const table of tables) create.table(table).run(db);
};

/**
 * @public
 *
 * Creates a table in the database.
 */
export const create = {
  table: (table: Table) => ({
    inspect: () => renderTable(table),
    run: async (db: Database) => { db.prepare(renderTable(table)).run() },
  }) as const,
} as const;

/**
 * @public
 *
 * Given a {@link Table} it creates a new insert statement builder.
 */
export const into = <T extends Table>(table: T) => ({
  /**
   * Puts the given rows into the insert statement.
   */
  insert: <S extends Expand<InferRowForInsert<T>>>(rows: S[]) => ({
    /**
     * Executes the insert statement against the database.
     */
    run: async (db: Database) => {
      if (rows.length === 0) return [] as Expand<InferRow<T>>[];

      const { [NAME]: _n, ...columns } = table;

      const shape = Object.fromEntries(
        Object
          .values(columns)
          .filter(col => !col.autoincrement)
          .map((col) => [col.field, col.schema]),
      );

      const data = z
        .strictObject(shape)
        .array()
        .parse(rows);

      const [sql, params, parse] = statement.insert(table, data);
      const results = db.prepare(sql).all(...params);

      return parse(results) as Expand<InferRow<T>>[];
    },
  }),
});

/**
 * @public
 *
 * Starts a query builder from the given table.
 */
export const from = <T extends Table>(table: T) => {
  const { [NAME]: _n, ...columns } = table;
  return new QueryBuilder(table, Object.values(columns));
};

/**
 * Defines a table.
 */
export const table = <T extends TableShape>(name: string, shape: T) => {
  const columns = Object.fromEntries(
    Object
      .entries(shape)
      .map(([field, col]) => [field, named(col, field)]),
  );

  return { [NAME]: name, ...columns } as Table<T>;
};
