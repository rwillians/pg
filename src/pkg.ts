import { version as semver } from '../package.json';

/**
 * @public Returns the project's current version.
 * @since  18.0.0
 */
export const version = () => semver;

/**
 * @public Returns the project's current major version.
 * @since  18.0.0
 */
export const major = () => semver.split('.')[0]!;
