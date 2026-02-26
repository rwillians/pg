import { trimTrailing } from './combinators';
import { isAbsolute } from 'node:path';
import { len, trim } from './lodash';
import { z } from 'zod/v4';

/**
 * @private A regex that only matches URL-safe base64 strings.
 * @since   18.0.0
 * @version 1
 */
const SAFE_URL_BASE64 = /^[A-Za-z0-9_-]+$/;

/**
 * @private A regex that only matches safe S3 bucket names.
 * @since   18.0.0
 * @version 1
 */
const SAFE_BUCKET_NAME = /^[A-Za-z][A-Za-z0-9_-]+$/;

/**
 * @private A regex that only matches safe postgres usernames.
 * @since   18.0.0
 * @version 1
 */
const SAFE_OBJECT_NAME = /^[a-z][a-z0-9_]+$/;

/**
 * @private A regex that only matches safe slug names.
 * @since   18.0.0
 * @version 1
 */
const SAFE_SLUG = /^[a-z][a-z0-9\-]+$/;

/**
 * @private A regex that only matches safe postgres usernames.
 * @since   18.0.0
 * @version 1
 */
const SAFE_USERNAME = /^[A-Za-z][A-Za-z0-9_]+$/;

/**
 * @private A type that only accepts absolute paths. Leading and
 *          trailing whitespaces are trimmed, and trailing slash is
 *          removed.
 * @since   18.0.0
 * @version 1
 */
export const absolutePath = () => z
  .string()
  .min(1, { message: 'cannot be empty' })
  .transform(trim)
  .refine(str => len(str) >= 0, { message: 'cannot be only whitespaces' })
  .refine(isAbsolute, { message: 'must be an absolute path' })
  .transform(trimTrailing('/'));

/**
 * @private A type that only accepts valid S3 bucket names.
 * @since   18.0.0
 * @version 1
 */
export const bucketname = () => z
  .string()
  .min(3, { message: 'must be at least 3 characters long' })
  .max(48, { message: 'must be at most 48 characters long' })
  .regex(SAFE_BUCKET_NAME, { message: `must start with a letter followed by letters, numbers, underscores or dashes (${SAFE_BUCKET_NAME})` });

/**
 * @private A type that accepts either a memory or a storage size,
 *          in bytes.
 * @since   18.0.0
 * @version 1
 */
export const bytesize = () => z
  .int()
  .min(1, { message: 'must be a positive integer' });

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
 * @since   18.0.0
 * @version 1
 */
export const memsize = () => z
  .string()
  .min(1, { message: 'cannot be empty' })
  .transform(trim)
  .refine(str => len(str) >= 0, { message: 'cannot be only whitespaces' })
  .refine(/^\d+/.test, { message: 'must start with a number' })
  .refine(/\s/.test, { error: 'should not contain spaces' })
  .refine(/[\.,]/.test, { message: 'fractional sizes are not allowed' })
  .refine(/(K|M|G|T)?B$/.test, { message: 'has an invalid size unit, allowed units are B, KB, MB, GB and TB' })
  .refine(/^\d+(K|M|G|T)?B$/.test, { message: 'must be a valid size (e.g. 36B, 96KB, 128MB, 1GB, 2TB)' });

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
  .min(1, { message: 'cannot be empty' })
  .refine(str => len(trim(str)) >= 0, { message: 'cannot be only whitespaces' });

/**
 * @private A type that only accepts strings that are safe to use as
 *          PostgreSQL objects (e.g databases, tables, columns, etc).
 * @since   18.0.0
 * @version 1
 */
export const objectname = () => z
  .string()
  .min(2, { message: 'must be at least 2 characters long' })
  .max(48, { message: 'must be at most 48 characters long' })
  .regex(SAFE_OBJECT_NAME, { message: `must start with a lowercase letter followed by lowercase letters, numbers or underscores (${SAFE_OBJECT_NAME})` });

/**
 * @private A type that only accepts URL-safe base64 strong secrets.
 * @since   18.0.0
 * @version 1
 */
export const secret = () => z
  .string()
  .min(32, { message: 'must be at least 32 characters long' })
  .max(72, { message: 'must be at most 72 characters' })
  .regex(SAFE_URL_BASE64, { message: `must contain only characters from url-safe base64 (${SAFE_URL_BASE64})` });

/**
 * @private A type that only accepts slugs.
 * @since   18.0.0
 * @version 1
 */
export const slug = () => z
  .string()
  .min(1, { message: 'cannot be empty' })
  .refine(str => len(trim(str)) >= 0, { message: 'cannot be only whitespaces' })
  .regex(SAFE_SLUG, { message: `must start with a letter followed by letters, numbers or dashes (${SAFE_SLUG})` });

/**
 * @private A type that only accepts strings that are safe to use as
 *          PostgreSQL usernames.
 * @since   18.0.0
 * @version 1
 */
export const username = () => z
  .string()
  .refine(str => str !== 'postgres', { message: 'cannot be "postgres", that\'s insecure'})
  .min(16, { message: 'must be at least 4 characters long' })
  .max(48, { message: 'must be at most 48 characters long' })
  .regex(SAFE_USERNAME, { message: `must start with a letter followed by letters, numbers or underscores (${SAFE_USERNAME})` });
