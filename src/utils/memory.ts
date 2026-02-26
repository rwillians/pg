import { ArgumentError } from '../errors';
import { regex } from 'arkregex';

/**
 * @private Byte multipliers for each supported memory unit.
 * @since   18.0.0
 * @version 1
 */
const MULTIPLIERS = {
  B:  1,
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
  TB: 1024 ** 4,
} as const;

/**
 * @private Matches a valid memory size string.
 * @since   18.0.0
 * @version 1
 */
const PATTERN = regex('^(\\d+)(B|KB|MB|GB|TB)$');

/**
 * @private Converts a memory size string to its value in bytes.
 * @since   18.0.0
 * @version 1
 */
const bytes = (input: string): number => {
  const match = PATTERN.exec(input);
  if (!match) throw new ArgumentError(`Invalid size: ${input}`);

  const [, value, unit] = match;

  return parseInt(value, 10) * MULTIPLIERS[unit];
};

/**
 * @public  Checks whether the given string is a valid memory size
 *          (e.g. `128MB`, `512GB`).
 * @since   18.0.0
 * @version 1
 */
export const valid = (input: string): boolean => PATTERN.test(input);

/**
 * @public  Returns true if the input memory size is greater than or
 *          equal to the specified minimum.
 * @since   18.0.0
 * @version 1
 */
export const gte = (input: string, min: string): boolean => bytes(input) >= bytes(min);

/**
 * @public  Returns true if the input memory size is less than or
 *          equal to the specified maximum.
 * @since   18.0.0
 * @version 1
 */
export const lte = (input: string, max: string): boolean => bytes(input) <= bytes(max);
