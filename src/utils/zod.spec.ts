import { describe, expect, test } from 'bun:test';
import { absolutePath, bucketname, bytesize, dbname, memsize, nes, secret, slug, username } from './zod';

describe('.absolutePath()', () => {
  test('accepts a valid absolute path', () => {
    expect(absolutePath().safeParse('/foo/bar').success).toBe(true);
  });

  test('transforms a trailing slash away', () => {
    expect(absolutePath().parse('/foo/bar/')).toBe('/foo/bar');
  });

  test('rejects an empty string', () => {
    expect(absolutePath().safeParse('').success).toBe(false);
  });

  test('rejects a relative path', () => {
    expect(absolutePath().safeParse('relative/path').success).toBe(false);
  });

  test('rejects a whitespace-only string', () => {
    expect(absolutePath().safeParse('   ').success).toBe(false);
  });
});

describe('.bucketname()', () => {
  test('accepts a valid bucket name', () => {
    expect(bucketname().safeParse('my-bucket').success).toBe(true);
  });

  test('accepts the minimum length', () => {
    expect(bucketname().safeParse('abc').success).toBe(true);
  });

  test('rejects a name that is too short', () => {
    expect(bucketname().safeParse('ab').success).toBe(false);
  });

  test('rejects a name starting with a number', () => {
    expect(bucketname().safeParse('1abc').success).toBe(false);
  });
});

describe('.bytesize()', () => {
  test('accepts 1', () => {
    expect(bytesize().safeParse(1).success).toBe(true);
  });

  test('accepts 100', () => {
    expect(bytesize().safeParse(100).success).toBe(true);
  });

  test('rejects 0', () => {
    expect(bytesize().safeParse(0).success).toBe(false);
  });

  test('rejects -1', () => {
    expect(bytesize().safeParse(-1).success).toBe(false);
  });

  test('rejects 1.5', () => {
    expect(bytesize().safeParse(1.5).success).toBe(false);
  });
});

describe('.dbname()', () => {
  test('accepts a valid database name', () => {
    expect(dbname().safeParse('mydb').success).toBe(true);
  });

  test('accepts underscores', () => {
    expect(dbname().safeParse('my_db').success).toBe(true);
  });

  test('rejects a name that is too short', () => {
    expect(dbname().safeParse('a').success).toBe(false);
  });

  test('rejects a name starting with a number', () => {
    expect(dbname().safeParse('1db').success).toBe(false);
  });
});

describe('.memsize()', () => {
  test('accepts 128MB', () => {
    expect(memsize().safeParse('128MB').success).toBe(true);
  });

  test('accepts 1GB', () => {
    expect(memsize().safeParse('1GB').success).toBe(true);
  });

  test('accepts 0B', () => {
    expect(memsize().safeParse('0B').success).toBe(true);
  });

  test('rejects abc', () => {
    expect(memsize().safeParse('abc').success).toBe(false);
  });

  test('rejects 1.5GB', () => {
    expect(memsize().safeParse('1.5GB').success).toBe(false);
  });

  test('rejects an empty string', () => {
    expect(memsize().safeParse('').success).toBe(false);
  });
});

describe('.nes()', () => {
  test('accepts a non-empty string', () => {
    expect(nes().safeParse('hello').success).toBe(true);
  });

  test('rejects an empty string', () => {
    expect(nes().safeParse('').success).toBe(false);
  });
});

describe('.secret()', () => {
  test('accepts a 32-char base64url string', () => {
    expect(secret().safeParse('abcdefghijklmnopqrstuvwxyz012345').success).toBe(true);
  });

  test('rejects a string shorter than 32 chars', () => {
    expect(secret().safeParse('abcdefghijklmnopqrstuvwxyz01234').success).toBe(false);
  });

  test('rejects a string with special characters', () => {
    expect(secret().safeParse('abcdefghijklmnopqrstuvwxyz0123!@').success).toBe(false);
  });
});

describe('.slug()', () => {
  test('accepts a valid slug', () => {
    expect(slug().safeParse('my-slug-1').success).toBe(true);
  });

  test('rejects an empty string', () => {
    expect(slug().safeParse('').success).toBe(false);
  });

  test('rejects uppercase characters', () => {
    expect(slug().safeParse('My-Slug').success).toBe(false);
  });

  test('rejects a slug starting with a number', () => {
    expect(slug().safeParse('1-slug').success).toBe(false);
  });
});

describe('.username()', () => {
  test('accepts a valid username of 16+ characters', () => {
    expect(username().safeParse('abcdefghijklmnop').success).toBe(true);
  });

  test('rejects the reserved name postgres', () => {
    expect(username().safeParse('postgres').success).toBe(false);
  });

  test('rejects a string shorter than 16 characters', () => {
    expect(username().safeParse('short').success).toBe(false);
  });
});
