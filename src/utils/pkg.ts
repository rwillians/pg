import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as semver from './semver';
import { z } from 'zod/v4';

/**
 * @private Subset of the package.json schema.
 * @since   18.0.0
 * @version 1
 */
const Package = z.object({
  version: z
    .string()
    .refine(semver.valid, { message: 'must be a valid semver version' }),
});

/**
 * @private Fetches the package.json file returning a subset of its
 *          contents.
 * @since   18.0.0
 * @version 1
 */
const pkg = () => {
  const path = 'package.json';
  const abs = resolve(join(import.meta.dir, '../../', path));

  if (!existsSync(abs)) {
    throw new Error(`${path} not found`);
  }

  const json = readFileSync(abs, { encoding: 'utf-8' });
  const contents = JSON.parse(json);

  return Package.parse(contents);
};

/**
 * @public  The project's current version.
 * @since   18.0.0
 * @version 1
 */
export const version = () => pkg().version;

/**
 * @public  The project's current major version.
 * @since   18.0.0
 * @version 1
 */
export const major = () => semver.major(pkg().version);
