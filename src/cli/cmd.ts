import type { ArgumentsCamelCase, CommandModule, Options } from 'yargs';
import { type Context, createContext } from '../context';

/**
 * @public Defines a cli command.
 * @since  18.0.0
 */
export const defineCommand = <
  T extends Record<string, any> = {},
  S extends Record<string, any> = {},
>(input: {
  signature: string;
  description?: string | undefined;
  build?: CommandModule<T, S>['builder'] | undefined;
  handle: (argv: ArgumentsCamelCase<S>) => Promise<any>;
}) => (): CommandModule<T, S> => ({
  command: input.signature,
  describe: input.description,
  builder: input.build,
  handler: input.handle,
});

/**
 * @public Defines options for a cli command.
 * @since  18.0.0
 */
export const defineOptions = <T extends Record<string, Options>>(options: T) => options;

/**
 * @public Defines a cli command that depends on context.
 * @since  18.0.0
 */
export const withContext = <
  T extends Record<string, any> = {},
  S extends Record<string, any> = {},
>(input: {
  signature: string;
  description?: string | undefined;
  build?: CommandModule<T, S>['builder'] | undefined;
  handle: (argv: ArgumentsCamelCase<S>, ctx: Context) => Promise<any>;
}) => ({
  signature: input.signature,
  description: input.description,
  build: input.build,
  handle: async (argv: ArgumentsCamelCase<S>) => input.handle(argv, await createContext(process.env)),
});
