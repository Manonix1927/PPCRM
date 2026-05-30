import { getNextBusinessDayPlainDate } from '@/utils/filter/utils/get-next-business-day-plain-date.util';
import { Temporal } from 'temporal-polyfill';

describe('getNextBusinessDayPlainDate', () => {
  it('should return tomorrow when tomorrow is a weekday', () => {
    const thursday = Temporal.PlainDate.from('2026-05-21');

    expect(getNextBusinessDayPlainDate(thursday).toString()).toBe('2026-05-22');
  });

  it('should return Monday when tomorrow is Saturday', () => {
    const friday = Temporal.PlainDate.from('2026-05-22');

    expect(getNextBusinessDayPlainDate(friday).toString()).toBe('2026-05-25');
  });

  it('should return Monday when tomorrow is Sunday', () => {
    const saturday = Temporal.PlainDate.from('2026-05-23');

    expect(getNextBusinessDayPlainDate(saturday).toString()).toBe('2026-05-25');
  });

  it('should return Monday when today is Sunday', () => {
    const sunday = Temporal.PlainDate.from('2026-05-24');

    expect(getNextBusinessDayPlainDate(sunday).toString()).toBe('2026-05-25');
  });
});
