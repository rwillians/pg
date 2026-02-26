import { describe, expect, test } from 'bun:test';
import { valid, gte, lte } from './memory';

describe('memory', () => {
  describe('valid', () => {
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

  describe('gte', () => {
    test('returns true when equal', () => {
      expect(gte('128MB', '128MB')).toBe(true);
    });

    test('returns true when greater', () => {
      expect(gte('256MB', '128MB')).toBe(true);
    });

    test('returns false when less', () => {
      expect(gte('64MB', '128MB')).toBe(false);
    });

    test('compares across units', () => {
      expect(gte('1GB', '512MB')).toBe(true);
      expect(gte('1MB', '1025KB')).toBe(false);
      expect(gte('1MB', '1024KB')).toBe(true);
    });

    test('throws on invalid input', () => {
      expect(() => gte('abc', '128MB')).toThrow();
      expect(() => gte('128MB', 'abc')).toThrow();
    });
  });

  describe('lte', () => {
    test('returns true when equal', () => {
      expect(lte('128MB', '128MB')).toBe(true);
    });

    test('returns true when less', () => {
      expect(lte('64MB', '128MB')).toBe(true);
    });

    test('returns false when greater', () => {
      expect(lte('256MB', '128MB')).toBe(false);
    });

    test('compares across units', () => {
      expect(lte('512MB', '1GB')).toBe(true);
      expect(lte('1025KB', '1MB')).toBe(false);
      expect(lte('1024KB', '1MB')).toBe(true);
    });

    test('throws on invalid input', () => {
      expect(() => lte('abc', '128MB')).toThrow();
      expect(() => lte('128MB', 'abc')).toThrow();
    });
  });
});
