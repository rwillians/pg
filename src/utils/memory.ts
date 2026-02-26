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
 * @public  Pattern that matches a valid memory size string.
 * @since   18.0.0
 * @version 1
 */
export const PATTERN = regex('^(\\d+)((K|M|G|T)?B)$');

/**
 * @public  The type of a memory size string.
 * @since   18.0.0
 * @version 1
 */
export type Size = typeof PATTERN.infer;

/**
 * @public  Pattern that matches the head of the memory size string
 *          (the numeric value).
 * @since   18.0.0
 * @version 1
 */
export const HEAD = regex('^\\d+');

/**
 * @public  Pattern that matches the tail of the memory size string
 *          (the memory unit).
 * @since   18.0.0
 * @version 1
 */
export const TAIL = regex('(K|M|G|T)?B$');

/**
 * @private Converts a memory size string to its value in bytes.
 * @since   18.0.0
 * @version 1
 */
const bytes = (input: string): number => {
  const match = PATTERN.exec(input);
  if (!match) throw new ArgumentError(`Invalid size: ${input}`);

  const [, value, unit] = match;
  const size = parseInt(value, 10);

  return size * MULTIPLIERS[unit];
};

/**
 * @public  Returns true if the input string is a valid memory size.
 * @since   18.0.0
 * @version 1
 */
export const valid = (input: string) => PATTERN.test(input);

/**
 * @public  Returns true if the input memory size is greater than or
 *          equal to the specified minimum.
 * @since   18.0.0
 * @version 1
 */
export const gte = (min: string | undefined) => min === undefined
  ? () => true
  : (input: string) => bytes(input) >= bytes(min);

/**
 * @public  Returns true if the input memory size is less than or
 *          equal to the specified maximum.
 * @since   18.0.0
 * @version 1
 */
export const lte = (max: string | undefined) => max === undefined
  ? () => true
  : (input: string) => bytes(input) <= bytes(max);
