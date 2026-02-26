import { describe, expect, test } from 'bun:test';
import { abortError, ctr, domException, error, instanceOf } from './type-guards';

describe('.abortError(value)', () => {
  test('returns true for a DOMException with name AbortError', () => {
    expect(abortError(new DOMException('msg', 'AbortError'))).toBe(true);
  });

  test('returns false for a DOMException with a different name', () => {
    expect(abortError(new DOMException('msg', 'TimeoutError'))).toBe(false);
  });

  test('returns false for a plain Error', () => {
    expect(abortError(new Error('msg'))).toBe(false);
  });
});

describe('.ctr(value)', () => {
  test('returns true for a class', () => {
    class Foo {}
    expect(ctr(Foo)).toBe(true);
  });

  test('returns true for built-in constructors', () => {
    expect(ctr(Error)).toBe(true);
  });

  test('returns false for arrow functions', () => {
    const fn = () => {};
    expect(ctr(fn)).toBeFalsy();
  });

  test('returns false for null', () => {
    expect(ctr(null)).toBeFalsy();
  });
});

describe('.domException(value)', () => {
  test('returns true for a DOMException', () => {
    expect(domException(new DOMException('msg'))).toBe(true);
  });

  test('returns false for a plain Error', () => {
    expect(domException(new Error('msg'))).toBe(false);
  });

  test('returns false for a string', () => {
    expect(domException('not an error')).toBe(false);
  });
});

describe('.domException(value, name)', () => {
  test('returns true when the name matches', () => {
    expect(domException(new DOMException('msg', 'AbortError'), 'AbortError')).toBe(true);
  });

  test('returns false when the name does not match', () => {
    expect(domException(new DOMException('msg', 'AbortError'), 'TimeoutError')).toBe(false);
  });

  test('returns false for non-DOMException values', () => {
    expect(domException(new Error('msg'), 'AbortError')).toBe(false);
  });
});

describe('.error(value)', () => {
  test('returns true for an Error instance', () => {
    expect(error(new Error('msg'))).toBe(true);
  });

  test('returns true for a TypeError instance', () => {
    expect(error(new TypeError('msg'))).toBe(true);
  });

  test('returns false for a string', () => {
    expect(error('not an error')).toBe(false);
  });

  test('returns false for a number', () => {
    expect(error(42)).toBe(false);
  });

  test('returns false for a plain object', () => {
    expect(error({ message: 'nope' })).toBe(false);
  });
});

describe('.instanceOf(value, constructor)', () => {
  test('returns true when value is an instance of the constructor', () => {
    expect(instanceOf(new Error('msg'), Error)).toBe(true);
  });

  test('returns true for subclass instances', () => {
    expect(instanceOf(new TypeError('msg'), Error)).toBe(true);
  });

  test('returns false when value is not an instance', () => {
    expect(instanceOf('not an error', Error)).toBe(false);
  });

  test('returns false for null', () => {
    expect(instanceOf(null, Error)).toBe(false);
  });
});
