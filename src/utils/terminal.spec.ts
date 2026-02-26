import { describe, expect, test } from 'bun:test';

import { ascii } from './terminal';

describe('.blue(str)', () => {
  test('wraps string with ANSI blue codes', () => {
    expect(ascii.blue('hello')).toBe('\u001b[34mhello\u001b[39m');
  });
});

describe('.bold(str)', () => {
  test('wraps string with ANSI bold codes', () => {
    expect(ascii.bold('hello')).toBe('\u001b[1mhello\u001b[22m');
  });
});

describe('.red(str)', () => {
  test('wraps string with ANSI red codes', () => {
    expect(ascii.red('hello')).toBe('\u001b[31mhello\u001b[39m');
  });
});

describe('.green(str)', () => {
  test('wraps string with ANSI green codes', () => {
    expect(ascii.green('hello')).toBe('\u001b[32mhello\u001b[39m');
  });
});

describe('.dim(str)', () => {
  test('wraps string with ANSI dim codes', () => {
    expect(ascii.dim('hello')).toBe('\u001b[2mhello\u001b[22m');
  });
});

describe('.italic(str)', () => {
  test('wraps string with ANSI italic codes', () => {
    expect(ascii.italic('hello')).toBe('\u001b[3mhello\u001b[23m');
  });
});

describe('.yellow(str)', () => {
  test('wraps string with ANSI yellow codes', () => {
    expect(ascii.yellow('hello')).toBe('\u001b[33mhello\u001b[39m');
  });
});

describe('.brightRed(str)', () => {
  test('wraps string with ANSI bright red codes', () => {
    expect(ascii.brightRed('hello')).toBe('\u001b[91mhello\u001b[39m');
  });
});

describe('.default(str)', () => {
  test('returns the string without any ANSI codes', () => {
    expect(ascii.default('hello')).toBe('hello');
  });
});

describe('.maybe(paint, options)', () => {
  test('applies paint when enabled', () => {
    const paint = ascii.maybe(ascii.red, { if: true });

    expect(paint('hello')).toBe(ascii.red('hello'));
  });

  test('returns plain string when disabled', () => {
    const paint = ascii.maybe(ascii.red, { if: false });

    expect(paint('hello')).toBe('hello');
  });
});

describe('StringLike support', () => {
  test('paint functions accept objects with toString()', () => {
    const obj = { toString: () => 'world' };

    expect(ascii.blue(obj)).toBe('\u001b[34mworld\u001b[39m');
    expect(ascii.default(obj)).toBe('world');
  });
});
