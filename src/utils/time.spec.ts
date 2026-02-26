import { describe, expect, test } from 'bun:test';
import { left, now, secs, minutes, hours, days, to } from './time';

describe('.left(ts)', () => {
  test('returns positive ms for a future date', () => {
    const future = new Date(Date.now() + 5000);
    const result = left(future);

    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(5000);
  });

  test('returns 0 for a past date', () => {
    const past = new Date(Date.now() - 5000);

    expect(left(past)).toBe(0);
  });

  test('returns ~0 for now', () => {
    const result = left(new Date());

    expect(result).toBeLessThanOrEqual(1);
  });
});

describe('.now()', () => {
  test('returns a Date instance', () => {
    expect(now()).toBeInstanceOf(Date);
  });
});

describe('.secs(n)', () => {
  test('converts seconds to milliseconds', () => {
    expect(secs(1)).toBe(1000);
    expect(secs(5)).toBe(5000);
  });

  test('handles 0', () => {
    expect(secs(0)).toBe(0);
  });

  test('handles negative numbers', () => {
    expect(secs(-3)).toBe(-3000);
  });
});

describe('.minutes(n)', () => {
  test('converts minutes to milliseconds', () => {
    expect(minutes(1)).toBe(60_000);
    expect(minutes(5)).toBe(300_000);
  });

  test('handles 0', () => {
    expect(minutes(0)).toBe(0);
  });

  test('handles negative numbers', () => {
    expect(minutes(-2)).toBe(-120_000);
  });
});

describe('.hours(n)', () => {
  test('converts hours to milliseconds', () => {
    expect(hours(1)).toBe(3_600_000);
    expect(hours(2)).toBe(7_200_000);
  });

  test('handles 0', () => {
    expect(hours(0)).toBe(0);
  });

  test('handles negative numbers', () => {
    expect(hours(-1)).toBe(-3_600_000);
  });
});

describe('.days(n)', () => {
  test('converts days to milliseconds', () => {
    expect(days(1)).toBe(86_400_000);
    expect(days(7)).toBe(604_800_000);
  });

  test('handles 0', () => {
    expect(days(0)).toBe(0);
  });

  test('handles negative numbers', () => {
    expect(days(-1)).toBe(-86_400_000);
  });
});

describe('.to.secs(ms)', () => {
  test('converts milliseconds to seconds', () => {
    expect(to.secs(1000)).toBe(1);
    expect(to.secs(5000)).toBe(5);
  });

  test('handles 0', () => {
    expect(to.secs(0)).toBe(0);
  });

  test('handles negative numbers', () => {
    expect(to.secs(-3000)).toBe(-3);
  });
});

describe('to.minutes(ms)', () => {
  test('converts milliseconds to minutes', () => {
    expect(to.minutes(60_000)).toBe(1);
    expect(to.minutes(300_000)).toBe(5);
  });

  test('handles 0', () => {
    expect(to.minutes(0)).toBe(0);
  });

  test('handles negative numbers', () => {
    expect(to.minutes(-120_000)).toBe(-2);
  });
});

describe('to.hours(ms)', () => {
  test('converts milliseconds to hours', () => {
    expect(to.hours(3_600_000)).toBe(1);
    expect(to.hours(7_200_000)).toBe(2);
  });

  test('handles 0', () => {
    expect(to.hours(0)).toBe(0);
  });

  test('handles negative numbers', () => {
    expect(to.hours(-3_600_000)).toBe(-1);
  });
});

describe('to.days(ms)', () => {
  test('converts milliseconds to days', () => {
    expect(to.days(86_400_000)).toBe(1);
    expect(to.days(604_800_000)).toBe(7);
  });

  test('handles 0', () => {
    expect(to.days(0)).toBe(0);
  });

  test('handles negative numbers', () => {
    expect(to.days(-86_400_000)).toBe(-1);
  });
});
