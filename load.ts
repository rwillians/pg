import { SQL } from 'bun';
import { createContext } from './src/context';

const FIRST_NAMES = [
  'Alice',
  'Bob',
  'Charlie',
  'Diana',
  'Ethan',
  'Fiona',
  'George',
  'Hannah',
  'Ian',
  'Jane',
  'John',
  'Julia',
  'Kevin',
  'Laura',
  'Michael',
  'Nina',
  'Oliver',
  'Paula',
  'Quentin',
  'Rachel',
  'Sam',
  'Tina',
  'Ursula',
  'Victor',
  'Wendy',
  'Xander',
  'Yara',
  'Zoe',
];

const LAST_NAMES = [
  'Allen',
  'Anderson',
  'Brown',
  'Clark',
  'Davis',
  'Garcia',
  'Hall',
  'Harris',
  'Jackson',
  'Johnson',
  'Jones',
  'Lee',
  'Lewis',
  'Martin',
  'Martinez',
  'Miller',
  'Moore',
  'Robinson',
  'Rodriguez',
  'Smith',
  'Taylor',
  'Thomas',
  'Thompson',
  'Walker',
  'White',
  'Williams',
  'Wilson',
  'Young',
];

const rand = <T extends any>(opts: T[]) => opts[Math.floor(Math.random() * opts.length)] as T;
const randomName = () => `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`;

const gen = (total: number) => ({
  of: (template: { [k: string]: () => any}) => ({
    inBatchesOf: function* (size: number) {
      const iters = Math.ceil(total / size);
      const schema = Object.entries(template);

      for (let i = 0; i < iters; i++) {
        yield Array.from({ length: size }, () => {
          const item: { [k: string]: any } = {};
          for (const [key, factory] of schema) item[key] = factory();
          return item;
        });
      }
    },
  }),
});

const main = async () => {
  const ctx = await createContext(process.env);

  const { config, logger } = ctx;
  const sql = new SQL(`postgres://${config.POSTGRES_USER}:${config.POSTGRES_PASSWORD}@localhost:5432/${config.POSTGRES_DB}`);

  await sql`
  CREATE TABLE IF NOT EXISTS load_test (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `;

  let count = 0;
  for (const batch of gen(1000000000).of({ name: randomName }).inBatchesOf(1000)) {
    await sql`INSERT INTO load_test ${sql(batch)};`;
    count += 1000;
    logger.info(`Inserted ${count} records...`);
  }

  logger.info('Done!');
};

main();
