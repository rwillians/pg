import type { Expand, StringLike } from '../types';

/**
 * @private Non-exhaustive table of ASCII code for styled console
 *          output.
 * @since   18.0.0
 * @version 1
 */
const ASCII_STYLE_CODES = {
  blue:      { open: 34, close: 39 },
  bold:      { open:  1, close: 22 },
  brightRed: { open: 91, close: 39 },
  dim:       { open:  2, close: 22 },
  green:     { open: 32, close: 39 },
  italic:    { open:  3, close: 23 },
  red:       { open: 31, close: 39 },
  yellow:    { open: 33, close: 39 },
} as const;

/**
 * @private A function type that applies a style to a string.
 * @since   18.0.0
 * @version 1
 */
export type Paint = (str: StringLike) => string;

/**
 * @private Returns a function that conditionally applies style to
 *          a string based on the provided boolean flag.
 * @since   18.0.0
 * @version 1
 */
const maybeStyled = (paint: Paint, { if: enabled }: { if: boolean }) => enabled
  ? paint
  : (str: StringLike) => str.toString();

/**
 * @private A registry of style functions for console output, one for
 *          each style in the ASCII codes table.
 * @since   18.0.0
 * @version 1
 */
export const ascii: Expand<{
  [K in keyof typeof ASCII_STYLE_CODES]: Paint;
} & {
  default: Paint;
  maybe: (paint: Paint, options: { if: boolean }) => Paint;
}> = Object.fromEntries(
  Object
    .entries(ASCII_STYLE_CODES)
    .map(([key, style]) => [key, (str: StringLike) => `\u001b[${style.open}m${str.toString()}\u001b[${style.close}m`])
    .concat([['default', (str: StringLike) => str.toString()], ['maybe', maybeStyled as any]]),
);
