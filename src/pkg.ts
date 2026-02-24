import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { z } from 'zod/v4';
import { _ } from './utils';

/**
 * Subset of the package.json schema.
 */
const Package = z.object({
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+(-.+)?$/, { message: 'must be a valid semver version' }),
});

/**
 * Fetches the package.json file returning its parsed contents.
 */
export const pkg = () => {
  const path = 'package.json';
  const abs = resolve(join(import.meta.dir, '../', path));

  if (!existsSync(abs)) {
    throw new Error(`${path} not found`);
  }

  const json = readFileSync(abs, { encoding: 'utf-8' });
  const contents = JSON.parse(json);

  return Package.parse(contents);
};

/**
 * The project's current version.
 */
export const version = () => pkg().version;

/**
 * The project's current major version.
 */
export const major = () => _.major(pkg().version);
