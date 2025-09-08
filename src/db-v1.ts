import { $ } from 'bun';
import { Database } from 'bun:sqlite';
import { isAbsolute } from 'node:path';
import { z } from 'zod/v4';
import { type Config } from './config';

type BaseFieldSpec =
  { type: 'INTEGER', primaryKey?: true, autoincrement?: true, nullable?: true, unique?: true }
  | { type: 'TEXT' | `VARCHAR(${number})`, primaryKey?: true, nullable?: true, unique?: true };

type FieldSpec = BaseFieldSpec & { schema: z.ZodType };

/**
 * @private
 */
const removeTrailing = (char: string) => (str: string) => str.endsWith(char)
  ? str.slice(0, (char.length * -1))
  : str;

const types = {
  pk: () => ({
    type: 'INTEGER',
    primaryKey: true,
    autoincrement: true,
    schema: z.number().int().min(1),
  }) satisfies FieldSpec,
  fk: () => ({
    type: 'INTEGER',
    schema: z.number().int().min(1),
  }),
  bytes: () => ({
    type: 'INTEGER',
    schema: z.number().int().nonnegative(),
  }) satisfies FieldSpec,
  datetime: () => ({
    type: 'INTEGER',
    schema: z.coerce.date(),
  }) satisfies FieldSpec,
  absolutePath: () => ({
    type: 'TEXT',
    schema: z
      .string()
      .min(1, { error: 'cannot be empty' })
      .refine(isAbsolute, { error: 'must be an absolute path' })
      .transform(removeTrailing('/')),
  }) satisfies FieldSpec,
  string: (length: number) => ({
    type: `VARCHAR(${length})`,
    schema: z.string().length(length),
  }) satisfies FieldSpec,
  nullable: {
    fk: () => ({
      type: 'INTEGER',
      nullable: true,
      schema: z.number().int().min(1).nullable().default(null),
    }) satisfies FieldSpec,
    datetime: () => ({
      type: 'INTEGER',
      nullable: true,
      schema: z.coerce.date().nullable().default(null),
    }) satisfies FieldSpec,
  },
};

export { types as t };

/**
 * @private
 */
const renderField = (spec: FieldSpec) => {
  const {
    type,
    primaryKey = false,
    // @ts-ignore-next-line
    autoincrement = false,
    nullable = false,
    unique = false,
  } = spec;

  const sql: string[] = [type];

  if (primaryKey) sql.push('PRIMARY KEY ASC');
  if (autoincrement) sql.push('AUTOINCREMENT');
  if (primaryKey) return sql.join(' ');

  if (!nullable) sql.push('NOT NULL');
  if (unique) sql.push('UNIQUE');

  return sql.join(' ');
};

/**
 * @private
 */
const renderTable = (name: string, spec: Record<string, FieldSpec>) => {
  const fields = Object
    .entries(spec)
    .map(([key, spec]) => `${key} ${renderField(spec)}`)
    .join(', ');

  return `CREATE TABLE IF NOT EXISTS ${name} (${fields});`;
};

/**
 * @private
 */
const $dump = (value: unknown) => {
  if (value === null) return null;
  if (typeof value === 'boolean') return value ? true : false;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.valueOf();

  throw new Error(`Unsupported value type: ${typeof value}`);
};

/**
 * @private
 */
const placeholder = (fields: string[]) => fields.map(() => '?').join(', ');

/**
 * @private
 */
const dump = (doc: Record<string, any>, fields: string[]) => fields
  .map(field => doc[field] ?? null)
  .map($dump);

/**
 * @private
 */
const MODELS: ({ setup: (db: Database) => Promise<void> })[] = [];

export const model = <
  S extends { id: FieldSpec, [k: string]: FieldSpec },
  R extends { [K in keyof S]: S[K]['schema'] },
>(table: string, spec: S) => {
  const schema = z.strictObject(Object.fromEntries(
    Object
      .entries(spec)
      .map(([key, spec]) => [key, spec.schema] as const),
  ) as R);

  type T = z.infer<typeof schema>

  const fields = Object.keys(spec);
  const insertFields = fields.filter(key => key !== 'id');

  const m = {
    /**
     * The model's table name.
     */
    table,
    /**
     * The model's Zod schema.
     */
    schema,
    /**
     * Creates the table and indexes in the database.
     */
    setup: async (db: Database) => {
      db.run(renderTable(table, spec));
    },
    /**
     * Fetches all the records in the table.
     */
    all: async (db: Database) => {
      const q = db.prepare(`SELECT * FROM ${table};`);
      const results = q.all();

      return schema
        .array()
        .parse(results);
    },
    /**
     * Finds a single record
     */
    findOneById: async (db: Database, id: number) => {
      const q = db.prepare(`SELECT * FROM ${table} WHERE id = ?;`);

      const result = q.get(id);
      if (!result) return null;

      return schema.parse(result);
    },
    /**
     * Inserts a new record into the table.
     */
    insertOne: async (db: Database, doc: Omit<T, 'id'>) => {
      const parsed = schema
        .omit({ id: true })
        .parse(doc);

      const query = db.prepare(`
      INSERT INTO ${table} (${insertFields.join(', ')})
      VALUES (${placeholder(insertFields)})
      RETURNING id;
      `);

      const [result] = query.all(...dump(parsed, insertFields));
      const { id } = (result as { id: number });

      return schema.parse({ ...parsed, id });
    },
    /**
     * Gets the latest record by a specific field.
     */
    latestBy: async (db: Database, field: keyof T & string) => {
      const q = db.prepare(`
        SELECT * FROM ${table}
        ORDER BY ${field} DESC
        LIMIT 1;
      `);

      const result = q.get();
      if (!result) return null;

      return m.schema.parse(result);
    },
  };

  MODELS.push(m);

  return m as typeof m & { infer: T };
};

export const extend = <
  T extends Record<string, any>,
  S extends Record<string, any>,
>(
  model: T,
  fn: (model: T) => S,
): S & T => ({
  ...fn(model),
  ...model,
});

export type { Database } from 'bun:sqlite';

export const connect = async (config: Config) => {
  const path = `${config.PG_STATE_DIR}/db.sqlite`;
  if (!await Bun.file(path).exists()) await $`touch ${path}`;

  return new Database(path);
};

export const setup = async (db: Database) => {
  for (const model of MODELS) await model.setup(db);
};
