import { matches, not, trimTrailing } from './combinators';
import { isAbsolute } from 'node:path';
import { len, trim } from './lodash';
import { regex } from 'arkregex';
import * as mem from './memory';
import { z } from 'zod/v4';

/**
 * @private A regex that only matches URL-safe base64 strings.
 * @since   18.0.0
 * @version 1
 */
const SAFE_URL_BASE64 = regex('^[A-Za-z0-9_-]+$');

/**
 * @private A regex that only matches safe S3 bucket names.
 * @since   18.0.0
 * @version 1
 */
const SAFE_BUCKET_NAME = regex('^[A-Za-z][A-Za-z0-9_-]+$');

/**
 * @private A regex that only matches safe postgres database names.
 * @since   18.0.0
 * @version 1
 */
const SAFE_DB_NAME = regex('^[A-Za-z][A-Za-z0-9_]+$');

/**
 * @private A regex that only matches safe slug names.
 * @since   18.0.0
 * @version 1
 */
const SAFE_SLUG = regex('^[a-z][a-z0-9\\-]+$');

/**
 * @private A regex that only matches safe postgres usernames.
 * @since   18.0.0
 * @version 1
 */
const SAFE_USERNAME = regex('^[A-Za-z][A-Za-z0-9_]+$');

/**
 * @private A type that only accepts absolute paths. Leading and
 *          trailing whitespaces are trimmed, and trailing slash is
 *          removed.
 * @since   18.0.0
 * @version 1
 */
export const absolutePath = () => z
  .string()
  .min(1, { error: 'cannot be empty' })
  .refine(str => len(trim(str)) >= 0, { error: 'cannot be only whitespaces' })
  .refine(isAbsolute, { error: 'must be an absolute path' })
  .transform(trimTrailing('/'));

/**
 * @private A type that only accepts valid S3 bucket names.
 * @since   18.0.0
 * @version 1
 */
export const bucketname = () => z
  .string()
  .min(3, { error: 'must be at least 3 characters long' })
  .max(48, { error: 'must be at most 48 characters long' })
  .regex(SAFE_BUCKET_NAME, { error: `must start with a letter followed by letters, numbers, underscores or dashes (${SAFE_BUCKET_NAME})` });

/**
 * @private A type that accepts either a memory or a storage size,
 *          in bytes.
 * @since   18.0.0
 * @version 1
 */
export const bytesize = () => z
  .int()
  .min(1, { error: 'must be a positive integer' });

/**
 * @private A type that only accepts strings that are safe to use as
 *          database names.
 * @since   18.0.0
 * @version 1
 */
export const dbname = () => z
  .string()
  .min(2, { error: 'must be at least 2 characters long' })
  .max(48, { error: 'must be at most 48 characters long' })
  .regex(SAFE_DB_NAME, { error: `must start with a letter followed by letters, numbers or underscores (${SAFE_DB_NAME})` });

/**
 * @private A type that only accepts memory / storage sizes.
 *
 *          The allowed units are:
 *          - Bytes (B);
 *          - Kilobytes (KB);
 *          - Megabytes (MB);
 *          - Gigabytes (GB); and
 *          - Terabytes (TB).
 *
 *          Fractional sizes are not allowed, use a lower unit
 *          instead (e.g. 1.5GB → 1536MB).
 *
 *          **NOTE:** Using progressive refinements to provide more
 *          helpful error messages.
 * @since   18.0.0
 * @version 1
 */
export const memsize = () => z
  .string()
  .min(1, { error: 'cannot be empty' })
  .refine(str => len(trim(str)) >= 0, { error: 'cannot be only whitespaces' })
  .regex(mem.HEAD, { error: 'must start with a number' })
  .refine(not(matches(/\s+/)), { error: 'cannot contain whitespaces' })
  .refine(not(matches(/,\./)), { error: 'cannot contain fractions of a unit' })
  .regex(mem.TAIL, { error: 'must be in a valid memory unit (B, KB, MB, GB or TB)' })
  .regex(mem.PATTERN, { error: `must be a valid memory size (e.g. 56KB, 128MB, 256GB, 1TB)` });

/**
 * @private A type that only accepts non-empty strings. Strings that
 *          contain only whitespaces are considered empty.
 *
 *          If non-empty, leading and trailing whitespaces are
 *          preserved.
 * @since   18.0.0
 * @version 1
 */
export const nes = () => z
  .string()
  .min(1, { error: 'cannot be empty' })
  .refine(str => len(trim(str)) >= 0, { error: 'cannot be only whitespaces' });

/**
 * @private A type that only accepts URL-safe base64 strong secrets.
 * @since   18.0.0
 * @version 1
 */
export const secret = () => z
  .string()
  .min(32, { error: 'must be at least 32 characters long' })
  .max(72, { error: 'must be at most 72 characters' })
  .regex(SAFE_URL_BASE64, { error: `must contain only characters from url-safe base64 (${SAFE_URL_BASE64})` });

/**
 * @private A type that only accepts slugs.
 * @since   18.0.0
 * @version 1
 */
export const slug = () => z
  .string()
  .min(1, { error: 'cannot be empty' })
  .refine(str => len(trim(str)) >= 0, { error: 'cannot be only whitespaces' })
  .regex(SAFE_SLUG, { error: `must start with a letter followed by letters, numbers or dashes (${SAFE_SLUG})` });

/**
 * @private A type that only accepts strings that are safe to use as
 *          PostgreSQL usernames.
 * @since   18.0.0
 * @version 1
 */
export const username = () => z
  .string()
  .refine(str => str !== 'postgres', { error: 'cannot be "postgres", that\'s insecure'})
  .min(16, { error: 'must be at least 4 characters long' })
  .max(48, { error: 'must be at most 48 characters long' })
  .regex(SAFE_USERNAME, { error: `must start with a letter followed by letters, numbers or underscores (${SAFE_USERNAME})` });
