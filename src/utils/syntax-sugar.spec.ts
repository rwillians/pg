import { describe, expect, test } from 'bun:test';
import { noop, raise } from './syntax-sugar';

describe('.noop()', () => {
  test('returns undefined', () => {
    expect(noop()).toBeUndefined();
  });
});

describe('.raise(error)', () => {
  test('throws the given error', () => {
    const error = new Error('something went wrong');

    expect(() => raise(error)).toThrow(error);
  });

  test('throws with the correct message', () => {
    expect(() => raise(new Error('boom'))).toThrow('boom');
  });
});
