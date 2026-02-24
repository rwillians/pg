import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Fetches the package.json file returning its parsed contents.
 */
const pkg = () => {
  const path = 'package.json';
  const abs = resolve(join(import.meta.dir, '../', path));

  if (!existsSync(abs)) {
    throw new Error(`${path} not found`);
  }

  const contents = readFileSync(abs, { encoding: 'utf-8' });

  return JSON.parse(contents);
};

/**
 * Fetches the package's current version.
 */
export const version = () => pkg().version;
