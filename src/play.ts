import { type InferRow, connect, from, into, setup, t, table } from './lity';
import { parseConfig } from './config';

const archives = table('archives', {
  id: t.id(),
  tar: t.custom.absolutePath(),
  size: t.custom.bytes(),
  archivedAt: t.datetime(),
});

type Foo = InferRow<typeof archives>;


(async () => {
  const config = parseConfig(process.env);
  const db = await connect(`${config.PG_STATE_DIR}/db-v2.sqlite`);

  await setup(db, [
    archives,
  ]);

  const data = await into(archives)
    .insert([{ tar: '/path/to/file.tar', size: 1234, archivedAt: new Date() }])
    .run(db);

  console.log('insert:', data);

  const rows = await from(archives)
    .where(c => c.gt(archives.size, 100))
    .limit(9)
    .offset(1)
    // .select([archives.id, archives.tar])
    .run(db);

  console.log('query:', rows);
})();
