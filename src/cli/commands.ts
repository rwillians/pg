import type { ArgumentsCamelCase, CommandModule, Options } from 'yargs';
import { type Context, createContext } from '../context';

export const $command = <
  T extends Record<string, any> = {},
  U extends Record<string, any> = {}
>(input: {
  signature: string;
  describe?: string | undefined;
  builder?: CommandModule<T, U>['builder'] | undefined;
  handler: (argv: ArgumentsCamelCase<U>, ctx: Context) => Promise<void>;
}) => (env: Bun.Env = process.env): CommandModule<T, U> => ({
  command: input.signature,
  describe: input.describe,
  builder: input.builder,
  handler: async (argv) => {
    const ctx = await createContext(env);
    return input.handler(argv, ctx);
  },
});

export const $options = <T extends Record<string, Options>>(options: T) => options;
