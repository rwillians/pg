import { parseConfig } from './config';
import { connect, setup } from './db';

export const createContext = async (env: Bun.Env) => {
  const config = parseConfig(env);

  const db = connect(config);
  await setup(db);

  return { config, db };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
