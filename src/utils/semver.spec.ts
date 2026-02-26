import { describe, expect, test } from 'bun:test';
import { major, split, valid } from './semver';

describe('.valid(input)', () => {
  test('accepts a standard version', () => {
    expect(valid('1.2.3')).toBe(true);
  });

  test('accepts all zeros', () => {
    expect(valid('0.0.0')).toBe(true);
  });

  test('accepts a version with a dotted pre-release tag', () => {
    expect(valid('1.2.3-beta.1')).toBe(true);
  });

  test('accepts a version with an underscore in the tag', () => {
    expect(valid('1.2.3-rc_1')).toBe(true);
  });

  test('rejects a version missing the patch component', () => {
    expect(valid('1.2')).toBe(false);
  });

  test('rejects a version with too many components', () => {
    expect(valid('1.2.3.4')).toBe(false);
  });

  test('rejects alphabetic nonsense', () => {
    expect(valid('abc')).toBe(false);
  });

  test('rejects an empty string', () => {
    expect(valid('')).toBe(false);
  });

  test('rejects a version with a trailing hyphen and no tag', () => {
    expect(valid('1.2.3-')).toBe(false);
  });
});

describe('.split(input)', () => {
  test('returns correct components for a plain version', () => {
    const result = split('1.2.3');

    expect(result.value).toBe('1.2.3');
    expect(result.major).toBe(1);
    expect(result.minor).toBe(2);
    expect(result.patch).toBe(3);
    expect(result.tag).toBeUndefined();
  });

  test('returns correct components for a version with a tag', () => {
    const result = split('10.20.30-alpha');

    expect(result.value).toBe('10.20.30-alpha');
    expect(result.major).toBe(10);
    expect(result.minor).toBe(20);
    expect(result.patch).toBe(30);
    expect(result.tag).toBe('alpha');
  });

  test('throws on invalid input', () => {
    expect(() => split('not-a-version')).toThrow();
  });
});

describe('.major(value)', () => {
  test('extracts major from a string', () => {
    expect(major('5.2.3')).toBe(5);
  });

  test('extracts major from a Semver object', () => {
    expect(major({ value: '5.2.3' as any, major: 5, minor: 2, patch: 3 })).toBe(5);
  });
});
