import { describe, expect, test } from 'bun:test';
import { valid, gte, lte } from './memory';

describe('.valid(size)', () => {
  test('accepts valid sizes', () => {
    expect(valid('0B')).toBe(true);
    expect(valid('56KB')).toBe(true);
    expect(valid('128MB')).toBe(true);
    expect(valid('512GB')).toBe(true);
    expect(valid('1TB')).toBe(true);
  });

  test('accepts plain bytes', () => {
    expect(valid('1024B')).toBe(true);
  });

  test('rejects fractions', () => {
    expect(valid('1.5GB')).toBe(false);
  });

  test('rejects missing unit', () => {
    expect(valid('128')).toBe(false);
  });

  test('rejects missing value', () => {
    expect(valid('MB')).toBe(false);
  });

  test('rejects empty string', () => {
    expect(valid('')).toBe(false);
  });

  test('rejects unknown units', () => {
    expect(valid('128PB')).toBe(false);
  });

  test('rejects negative values', () => {
    expect(valid('-128MB')).toBe(false);
  });
});

describe('.gte(min)(input)', () => {
  test('returns true when equal', () => {
    expect(gte('128MB')('128MB')).toBe(true);
  });

  test('returns true when greater', () => {
    expect(gte('128MB')('256MB')).toBe(true);
  });

  test('returns false when less', () => {
    expect(gte('128MB')('64MB')).toBe(false);
  });

  test('compares across units', () => {
    expect(gte('512MB')('1GB')).toBe(true);
    expect(gte('1025KB')('1MB')).toBe(false);
    expect(gte('1024KB')('1MB')).toBe(true);
  });

  test('throws on invalid input', () => {
    expect(() => gte('128MB')('abc')).toThrow();
    expect(() => gte('abc')('128MB')).toThrow();
  });
});

describe('.lte(max)(input)', () => {
  test('returns true when equal', () => {
    expect(lte('128MB')('128MB')).toBe(true);
  });

  test('returns true when less', () => {
    expect(lte('128MB')('64MB')).toBe(true);
  });

  test('returns false when greater', () => {
    expect(lte('128MB')('256MB')).toBe(false);
  });

  test('compares across units', () => {
    expect(lte('1GB')('512MB')).toBe(true);
    expect(lte('1MB')('1025KB')).toBe(false);
    expect(lte('1MB')('1024KB')).toBe(true);
  });

  test('throws on invalid input', () => {
    expect(() => lte('128MB')('abc')).toThrow();
    expect(() => lte('abc')('128MB')).toThrow();
  });
});
