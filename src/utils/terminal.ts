const ASCII_STYLE_CODES = {
  blue:       { open: 34, close: 39 },
  bold:       { open: 1,  close: 22 },
  brightRed:  { open: 91, close: 39 },
  dim:        { open: 2,  close: 22 },
  green:      { open: 32, close: 39 },
  italic:     { open: 3,  close: 23 },
  red:        { open: 31, close: 39 },
  yellow:     { open: 33, close: 39 },
} as const;

type StringLike =
  string
  | { toString: () => string };

/**
 * @private Terminal styles for ASCII output.
 * @since   0.1.0
 * @version 0.1.0
 */
export const style: {
  [K in keyof typeof ASCII_STYLE_CODES]: (str: StringLike) => string;
} & {
  default: (str: StringLike) => string;
} = Object.fromEntries(
  Object.entries(ASCII_STYLE_CODES)
    .map(([key, style]) => [key, (str: StringLike) => `\u001b[${style.open}m${str.toString()}\u001b[${style.close}m`])
    .concat([['default', (str: StringLike) => str.toString()]]), // just an alias for no style
);
