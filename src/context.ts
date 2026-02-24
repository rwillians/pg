import { parseConfig } from './config';

export const createContext = async (env: Bun.Env) => {
  const config = parseConfig(env);

  return { config };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
