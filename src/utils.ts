import { isAbsolute } from 'node:path';
import { z } from 'zod/v4';

//////////////////////////////////////////////////////////////////////
///                             LODASH                             ///
//////////////////////////////////////////////////////////////////////

const keys = <T extends Record<string, any>>(obj: T) => Object.keys(obj) as (keyof T)[];

export const _ = {
  keys,
};

//////////////////////////////////////////////////////////////////////
///                            TERMINAL                            ///
//////////////////////////////////////////////////////////////////////

/**
 * @private
 */
const ASCII_STYLE_CODES = {
  blue: { open: 34, close: 39 },
  bold: { open: 1, close: 22 },
  brightRed: { open: 91, close: 39 },
  dim: { open: 2, close: 22 },
  green: { open: 32, close: 39 },
  italic: { open: 3, close: 23 },
  red: { open: 31, close: 39 },
  yellow: { open: 33, close: 39 },
} as const;

/**
 * Terminal styles for ASCII output.
 */
export const s: {
  [K in keyof typeof ASCII_STYLE_CODES]: (str: any) => string;
} & {
  default: (str: any) => string;
} = Object.fromEntries(
  Object.entries(ASCII_STYLE_CODES)
    .map(([key, style]) => [key, (str: any) => `\u001b[${style.open}m${str}\u001b[${style.close}m`])
    .concat([['default', (str: any) => str.toString()]]), // just an alias for no style
);

//////////////////////////////////////////////////////////////////////
///                             UTILS                              ///
//////////////////////////////////////////////////////////////////////

export const humanReadableSize = (sizeBytes: number): string => {
  if (sizeBytes < 1000) return `${sizeBytes}B`;
  if (sizeBytes < 1000000) return `${(sizeBytes / 1000).toFixed(2)}KB`;
  if (sizeBytes < 1000000000) return `${(sizeBytes / 1000000).toFixed(2)}MB`;
  if (sizeBytes < 1000000000000) return `${(sizeBytes / 1000000000).toFixed(2)}GB`;
  return `${(sizeBytes / 1000000000000).toFixed(2)}TB`;
};

export const withHumanReadableSize = <T extends { size: number, [k: string]: any }>(data: T) => ({
  ...data,
  size: humanReadableSize(data.size),
});

export const sumBy = <T extends Record<string, any>, K extends keyof T>(k: K) =>
  (acc: number, item: T): number =>
    acc + (item[k] ?? 0);

//////////////////////////////////////////////////////////////////////
///                              ZOD                               ///
//////////////////////////////////////////////////////////////////////

const removeTrailing = (char: string) => (str: string) => str.endsWith(char)
  ? str.slice(0, (char.length * -1))
  : str;

const absolutePath = () => z
  .string()
  .min(1, { error: 'cannot be empty' })
  .refine(isAbsolute, { error: 'must be an absolute path' })
  .transform(removeTrailing('/'));

const secret = () => z
  .string()
  .min(8, { error: 'are you even trying to make it safe?! please make it at least 8 chars long' })
  .max(64, { error: 'lets leve some chars left for the rest of the connection string, try 64 chars long instead' })
  .refine((value) => !value.includes(' '), { error: 'no blank spaces please, are you trying to break something?!' })
  .refine((value) => !value.includes('\n'), { error: 'seriously, a line break?! thats some psycho shit, just saying' });

/**
 * [n]on-[e]mpty [s]tring
 */
const nen = () => z
  .string()
  .min(1, { error: 'cannot be empty' });

/**
 * Custom Zod types.
 */
export const t = {
  absolutePath,
  nen,
  secret,
};

export { z } from 'zod/v4';
