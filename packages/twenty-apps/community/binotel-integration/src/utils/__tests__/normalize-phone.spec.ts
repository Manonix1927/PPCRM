import { describe, expect, it } from 'vitest';
import {
  getPhoneSearchVariants,
  normalizePhone,
} from 'src/utils/normalize-phone';

describe('normalizePhone', () => {
  it('strips non-digits', () => {
    expect(normalizePhone('+380 (67) 123-45-67')).toBe('380671234567');
  });

  it('adds Ukraine country code for 0-prefixed 10-digit numbers', () => {
    expect(normalizePhone('0671234567')).toBe('380671234567');
  });

  it('removes 00 international prefix', () => {
    expect(normalizePhone('00380671234567')).toBe('380671234567');
  });

  it('keeps already-normalized number untouched', () => {
    expect(normalizePhone('380671234567')).toBe('380671234567');
  });

  it('returns empty string for null/undefined/blank', () => {
    expect(normalizePhone(null)).toBe('');
    expect(normalizePhone(undefined)).toBe('');
    expect(normalizePhone('   ')).toBe('');
  });
});

describe('getPhoneSearchVariants', () => {
  it('returns variants with +, without +, last-9-digits and 0-prefix', () => {
    const variants = getPhoneSearchVariants('+380671234567');
    expect(variants).toContain('380671234567');
    expect(variants).toContain('+380671234567');
    expect(variants).toContain('671234567');
    expect(variants).toContain('0671234567');
  });

  it('returns empty array for empty input', () => {
    expect(getPhoneSearchVariants('')).toEqual([]);
    expect(getPhoneSearchVariants(null)).toEqual([]);
  });
});
