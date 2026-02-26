import { describe, expect, test } from 'bun:test';
import { reject, rescue } from './promise';

describe('.reject(value)', () => {
  test('rejects the promise with the given error', async () => {
    await expect(reject(new Error('boom'))).rejects.toThrow('boom');
  });
});

describe('.rescue(predicate, handler)(error)', () => {
  describe('with a constructor predicate', () => {
    class NotFoundError extends Error {}

    const handler = rescue(NotFoundError, () => null);

    test('calls the handler when the error matches the constructor', () => {
      expect(handler(new NotFoundError())).toBeNull();
    });

    test('re-rejects when the error does not match the constructor', async () => {
      const err = new TypeError('x');

      await expect(Promise.reject(err).catch(handler)).rejects.toThrow('x');
    });
  });

  describe('with a string predicate (DOMException name)', () => {
    const handler = rescue('AbortError', () => 'aborted');

    test('calls the handler when the DOMException name matches', () => {
      expect(handler(new DOMException('x', 'AbortError'))).toBe('aborted');
    });

    test('re-rejects when the error is not a matching DOMException', async () => {
      const err = new Error('x');

      await expect(Promise.reject(err).catch(handler)).rejects.toThrow('x');
    });
  });

  describe('with a predicate function', () => {
    const hasMessage = (err: unknown) => err instanceof Error && err.message.includes('not found');
    const handler = rescue(hasMessage, () => null);

    test('calls the handler when the predicate returns true', () => {
      expect(handler(new Error('not found'))).toBeNull();
    });

    test('re-rejects when the predicate returns false', async () => {
      const err = new Error('other');

      await expect(Promise.reject(err).catch(handler)).rejects.toThrow('other');
    });
  });
});
