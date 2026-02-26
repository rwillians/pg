import { describe, expect, test } from 'bun:test';
import { LazyChain, lazy } from './lazy-chain';

describe('LazyChain', () => {
  describe('.join(value)', () => {
    test('creates a fulfilled chain', () => {
      expect(LazyChain.join(42).unwrap()).toBe(42);
    });
  });

  describe('.reject(error)', () => {
    test('creates a rejected chain that throws on unwrap', () => {
      expect(() => LazyChain.reject('boom').unwrap()).toThrow('boom');
    });
  });

  describe('.then(cb)', () => {
    test('transforms the value', () => {
      const result = LazyChain.join(2)
        .then((v) => v * 3)
        .unwrap();

      expect(result).toBe(6);
    });

    test('chains multiple thens', () => {
      const result = LazyChain.join('hello')
        .then((v) => v.toUpperCase())
        .then((v) => `${v}!`)
        .unwrap();

      expect(result).toBe('HELLO!');
    });

    test('skips when chain is rejected', () => {
      const result = LazyChain.reject('fail')
        .then(() => 'should not unwrap');

      expect(() => result.unwrap()).toThrow('fail');
    });

    test('switches to rejected if callback throws', () => {
      const result = LazyChain.join(1)
        .then(() => { throw new Error('oops'); })
        .then(() => 'should not unwrap');

      expect(() => result.unwrap()).toThrow('oops');
    });
  });

  describe('.catch(cb)', () => {
    test('recovers from a rejection', () => {
      const result = LazyChain.reject('fail')
        .catch((err) => `recovered: ${err}`)
        .unwrap();

      expect(result).toBe('recovered: fail');
    });

    test('skips when chain is fulfilled', () => {
      const result = LazyChain.join(10)
        .catch(() => 'should not unwrap')
        .unwrap();

      expect(result).toBe(10);
    });

    test('switches to rejected if callback throws', () => {
      const result = LazyChain.reject('first')
        .catch(() => { throw new Error('second'); });

      expect(() => result.unwrap()).toThrow('second');
    });
  });

  describe('.catch(cb).then(cb)', () => {
    test('catch recovers and then continues', () => {
      const result = LazyChain.reject('err')
        .catch(() => 5)
        .then((v) => v * 2)
        .unwrap();

      expect(result).toBe(10);
    });

    test('then throws, catch recovers, then continues', () => {
      const result = LazyChain.join('start')
        .then(() => { throw new Error('mid-fail'); })
        .catch((err) => (err as Error).message)
        .then((v) => `got: ${v}`)
        .unwrap();

      expect(result).toBe('got: mid-fail');
    });

    test('multiple catch blocks, only the first matching one runs', () => {
      const calls: string[] = [];

      const result = LazyChain.reject('x')
        .catch((err) => { calls.push('first'); return `caught: ${err}`; })
        .catch(() => { calls.push('second'); return 'should not unwrap'; })
        .unwrap();

      expect(result).toBe('caught: x');
      expect(calls).toEqual(['first']);
    });
  });

  describe('await', () => {
    test('resolves a fulfilled chain', async () => {
      const value = await LazyChain.join(42);

      expect(value).toBe(42);
    });

    test('resolves after chained thens', async () => {
      const value = await LazyChain.join(10)
        .then((v) => v + 1)
        .then((v) => v * 2);

      expect(value).toBe(22);
    });

    test('rejects on a rejected chain', async () => {
      try {
        await LazyChain.reject('boom');
        throw new Error('should not reach');
      } catch (err) {
        expect(err).toBe('boom');
      }
    });

    test('rejects when a then throws', async () => {
      try {
        await LazyChain.join(1).then(() => { throw new Error('fail'); });
        throw new Error('should not reach');
      } catch (err) {
        expect((err as Error).message).toBe('fail');
      }
    });
  });

  describe('laziness', () => {
    test('does not execute until unwrap is called', () => {
      let executed = false;

      const chain = LazyChain.join(1)
        .then((v) => { executed = true; return v; });

      expect(executed).toBe(false);

      chain.unwrap();

      expect(executed).toBe(true);
    });

    test('can be unwrap multiple times', () => {
      let count = 0;

      const chain = LazyChain.join(1)
        .then((v) => { count++; return v + 1; });

      expect(chain.unwrap()).toBe(2);
      expect(chain.unwrap()).toBe(2);
      expect(count).toBe(2);
    });
  });
});

describe('lazy(value)', () => {
  test('behaves the same as LazyChain.join', () => {
    const result = lazy(2)
      .then((v) => v * 3)
      .unwrap();

    expect(result).toBe(6);
  });
});
