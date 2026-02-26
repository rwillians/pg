import { describe, expect, test } from 'bun:test';
import { entries, has, keys, len, mapValues, pick, rand, toString, trim, trimLeading, trimTrailing } from './lodash';

describe('.entries(obj)', () => {
  test('returns key-value pairs', () => {
    expect(entries({ a: 1, b: 2 })).toEqual([['a', 1], ['b', 2]]);
  });

  test('returns empty array for empty object', () => {
    expect(entries({})).toEqual([]);
  });
});

describe('.has(substring)(str)', () => {
  test('returns true when substring is present', () => {
    const hasHello = has('hello');
    expect(hasHello('say hello world')).toBe(true);
  });

  test('returns false when substring is absent', () => {
    const hasHello = has('hello');
    expect(hasHello('goodbye world')).toBe(false);
  });

  test('returns true for empty substring', () => {
    expect(has('')('anything')).toBe(true);
  });

  test('returns true when str equals substring exactly', () => {
    expect(has('exact')('exact')).toBe(true);
  });
});

describe('.keys(obj)', () => {
  test('returns keys of an object', () => {
    expect(keys({ x: 1, y: 2, z: 3 })).toEqual(['x', 'y', 'z']);
  });

  test('returns empty array for empty object', () => {
    expect(keys({})).toEqual([]);
  });
});

describe('.len(value)', () => {
  test('returns length of a string', () => {
    expect(len('hello')).toBe(5);
  });

  test('returns length of an array', () => {
    expect(len([1, 2, 3])).toBe(3);
  });

  test('returns 0 for empty string', () => {
    expect(len('')).toBe(0);
  });

  test('returns 0 for empty array', () => {
    expect(len([])).toBe(0);
  });
});

describe('.mapValues(obj, fn)', () => {
  test('maps values using the provided function', () => {
    const result = mapValues({ a: 1, b: 2 }, (v) => v * 10);
    expect(result).toEqual({ a: 10, b: 20 });
  });

  test('passes key as second argument', () => {
    const result = mapValues({ x: 1 }, (_, k) => k);
    expect(result).toEqual({ x: 'x' });
  });

  test('returns empty object for empty input', () => {
    expect(mapValues({}, (v) => v)).toEqual({});
  });
});

describe('.pick(obj, keys)', () => {
  test('picks specified keys from an object', () => {
    const result = pick({ a: 1, b: 2, c: 3 }, ['a', 'c']);
    expect(result).toEqual({ a: 1, c: 3 });
  });

  test('ignores keys that do not exist', () => {
    const result = pick({ a: 1 } as Record<string, number>, ['a', 'z']);
    expect(result).toEqual({ a: 1 });
  });

  test('returns empty object when keys is empty', () => {
    expect(pick({ a: 1, b: 2 }, [])).toEqual({});
  });

  test('returns empty object for empty input', () => {
    expect(pick({}, [])).toEqual({});
  });
});

describe('.rand(options)', () => {
  test('returns an element from the array', () => {
    const options = ['a', 'b', 'c', 'd'];

    for (let i = 0; i < 20; i++) {
      expect(options).toContain(rand(options));
    }
  });

  test('returns the only element for single-item array', () => {
    expect(rand([42])).toBe(42);
  });
});

describe('.toString(value)', () => {
  test('returns empty string for undefined', () => {
    expect(toString(undefined)).toBe('');
  });

  test('returns empty string for null', () => {
    expect(toString(null)).toBe('');
  });

  test('returns the string as-is for string input', () => {
    expect(toString('hello')).toBe('hello');
  });

  test('returns empty string for empty string input', () => {
    expect(toString('')).toBe('');
  });

  test('calls .toString() on objects with toString method', () => {
    const obj = { toString: () => 'custom' };
    expect(toString(obj)).toBe('custom');
  });
});

describe('.trim(str)', () => {
  test('trims whitespace from both ends', () => {
    expect(trim('  hello  ')).toBe('hello');
  });

  test('trims tabs and newlines', () => {
    expect(trim('\t\nhello\n\t')).toBe('hello');
  });

  test('returns empty string when input is only whitespace', () => {
    expect(trim('   ')).toBe('');
  });

  test('returns same string when no whitespace to trim', () => {
    expect(trim('hello')).toBe('hello');
  });
});

describe('.trimLeading(str, char)', () => {
  test('removes leading characters recursively', () => {
    expect(trimLeading('///foo', '/')).toBe('foo');
  });

  test('removes single leading character', () => {
    expect(trimLeading('/foo', '/')).toBe('foo');
  });

  test('does nothing when char is not leading', () => {
    expect(trimLeading('foo/', '/')).toBe('foo/');
  });

  test('returns empty string when input is only the char', () => {
    expect(trimLeading('///', '/')).toBe('');
  });

  test('handles multi-character prefix', () => {
    expect(trimLeading('abababfoo', 'ab')).toBe('foo');
  });
});

describe('.trimTrailing(str, char)', () => {
  test('removes trailing characters recursively', () => {
    expect(trimTrailing('foo///', '/')).toBe('foo');
  });

  test('removes single trailing character', () => {
    expect(trimTrailing('foo/', '/')).toBe('foo');
  });

  test('does nothing when char is not trailing', () => {
    expect(trimTrailing('/foo', '/')).toBe('/foo');
  });

  test('returns empty string when input is only the char', () => {
    expect(trimTrailing('///', '/')).toBe('');
  });

  test('handles multi-character suffix', () => {
    expect(trimTrailing('fooabab', 'ab')).toBe('foo');
  });
});
