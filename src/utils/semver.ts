import { ArgumentError } from '../errors';
import { regex } from 'arkregex';

/**
 * @private Regex matching a valid semantic versioning string.
 * @since   18.0.0
 * @version 1
 */
const PATTERN = regex('^(\\d+)\\.(\\d+)\\.(\\d+)(-([a-z0-9_\\-\\.]+))?$');

/**
 * @public  A semantic version split into its components.
 * @since   18.0.0
 * @version 1
 */
export type Semver = {
  value: typeof PATTERN.infer;
  major: number;
  minor: number;
  patch: number;
  tag?: string | undefined;
};

/**
 * @public  Validates whether the given input is a valid semantic
 *          version string.
 * @since   18.0.0
 * @version 1
 */
export const valid = (input: string): input is Semver['value'] => PATTERN.test(input);

/**
 * @public  Splits a semantic version string into its components.
 * @since   18.0.0
 * @version 1
 */
export const split = (input: string): Semver => {
  const match = PATTERN.exec(input);
  if (!match) throw new ArgumentError(`Invalid semantic version: ${input}`);

  const [value, major, minor, patch,, tag] = match;

  return {
    value,
    major: parseInt(major, 10),
    minor: parseInt(minor, 10),
    patch: parseInt(patch, 10),
    tag,
  };
};

/**
 * @public  Extracts the major version from the given semver string.
 * @since   18.0.0
 * @version 1
 */
export const major = (value: Semver | string) => typeof value === 'string'
  ? split(value).major
  : value.major;
