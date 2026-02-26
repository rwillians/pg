import { describe, expect, test } from 'bun:test';
import { instanceOf, domException, mapValues, matches, not, pick, trimLeading, trimTrailing, when } from './combinators';

describe('.instanceOf(constructor)(value)', () => {
  test('returns true when value is an instance of the constructor', () => {
    expect(instanceOf(Error)(new Error('msg'))).toBe(true);
  });

  test('returns false when value is not an instance', () => {
    expect(instanceOf(Error)('nope')).toBe(false);
  });

  test('returns true for subclass instances', () => {
    expect(instanceOf(Error)(new TypeError('msg'))).toBe(true);
  });
});

describe('.domException(subtype)(value)', () => {
  test('returns true when the DOMException name matches', () => {
    expect(domException('AbortError')(new DOMException('x', 'AbortError'))).toBe(true);
  });

  test('returns false when the DOMException name does not match', () => {
    expect(domException('AbortError')(new DOMException('x', 'TimeoutError'))).toBe(false);
  });

  test('returns false for non-DOMException values', () => {
    expect(domException('AbortError')(new Error('x'))).toBe(false);
  });
});

describe('.mapValues(mapper)(obj)', () => {
  test('maps over each value in the object', () => {
    const double = mapValues((v: number) => v * 2);

    expect(double({ a: 1, b: 2 })).toEqual({ a: 2, b: 4 });
  });

  test('returns an empty object when given an empty object', () => {
    const double = mapValues((v: number) => v * 2);

    expect(double({})).toEqual({});
  });
});

describe('.matches(pattern)(str)', () => {
  test('returns true when the string matches the pattern', () => {
    expect(matches(/^foo/)('foobar')).toBe(true);
  });

  test('returns false when the string does not match', () => {
    expect(matches(/^foo/)('barfoo')).toBe(false);
  });
});

describe('.not(predicate)(...args)', () => {
  test('negates a truthy predicate result', () => {
    const isPositive = (x: number) => x > 0;

    expect(not(isPositive)(1)).toBe(false);
  });

  test('negates a falsy predicate result', () => {
    const isPositive = (x: number) => x > 0;

    expect(not(isPositive)(-1)).toBe(true);
  });
});

describe('.pick(keys)(obj)', () => {
  test('picks only the specified keys', () => {
    expect(pick<{ a: number; b: number }, 'a'>(['a'])({ a: 1, b: 2 })).toEqual({ a: 1 });
  });

  test('returns an empty object when no keys match', () => {
    expect(pick<{ a: number }, never>([])({ a: 1 })).toEqual({});
  });
});

describe('.trimLeading(char)(str)', () => {
  test('removes all leading occurrences of the character', () => {
    expect(trimLeading('/')('///foo')).toBe('foo');
  });

  test('returns the string unchanged when it does not start with the character', () => {
    expect(trimLeading('/')('foo')).toBe('foo');
  });

  test('returns an empty string when the string is only the character', () => {
    expect(trimLeading('/')('///')).toBe('');
  });
});

describe('.trimTrailing(char)(str)', () => {
  test('removes all trailing occurrences of the character', () => {
    expect(trimTrailing('/')('foo///')).toBe('foo');
  });

  test('returns the string unchanged when it does not end with the character', () => {
    expect(trimTrailing('/')('foo')).toBe('foo');
  });

  test('returns an empty string when the string is only the character', () => {
    expect(trimTrailing('/')('///')).toBe('');
  });
});

describe('.when(predicate, cb)(value)', () => {
  test('calls the callback when the predicate is satisfied', () => {
    const doubleIfNumber = when(
      (v: unknown) => typeof v === 'number',
      (v: number) => v * 2,
    );

    expect(doubleIfNumber(5)).toBe(10);
  });

  test('returns undefined when the predicate is not satisfied', () => {
    const doubleIfNumber = when(
      (v: unknown) => typeof v === 'number',
      (v: number) => v * 2,
    );

    expect(doubleIfNumber('hello')).toBeUndefined();
  });
});
