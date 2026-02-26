import { describe, expect, test } from 'bun:test';
import { secret, slug } from './generators';

describe('.secret(len)', () => {
  test('defaults to length 32', () => {
    expect(secret()).toHaveLength(32);
  });

  test('contains only URL-safe base64 characters by default', () => {
    expect(secret()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  test('returns a string of the requested length (16)', () => {
    expect(secret(16)).toHaveLength(16);
  });

  test('contains only URL-safe base64 characters (16)', () => {
    expect(secret(16)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  test('returns a string of the requested length (64)', () => {
    expect(secret(64)).toHaveLength(64);
  });
});

describe('.slug()', () => {
  test('matches the word-word-word pattern', () => {
    expect(slug()).toMatch(/^[a-z]+-[a-z]+-[a-z]+$/);
  });
});
