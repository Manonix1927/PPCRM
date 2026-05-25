import { isDateFieldValueDayOfMonthEven } from '@/object-record/record-field/ui/utils/isDateFieldValueDayOfMonthEven';

describe('isDateFieldValueDayOfMonthEven', () => {
  it('should return true for DATE field with even day of month', () => {
    expect(
      isDateFieldValueDayOfMonthEven({
        fieldValue: '2026-05-26',
        fieldType: 'DATE',
        userTimeZone: 'Europe/Kyiv',
      }),
    ).toBe(true);
  });

  it('should return false for DATE field with odd day of month', () => {
    expect(
      isDateFieldValueDayOfMonthEven({
        fieldValue: '2026-05-21',
        fieldType: 'DATE',
        userTimeZone: 'Europe/Kyiv',
      }),
    ).toBe(false);
  });

  it('should use user timezone for DATE_TIME field', () => {
    expect(
      isDateFieldValueDayOfMonthEven({
        fieldValue: '2026-05-25T22:00:00.000Z',
        fieldType: 'DATE_TIME',
        userTimeZone: 'Europe/Kyiv',
      }),
    ).toBe(true);
  });

  it('should return false when field value is empty', () => {
    expect(
      isDateFieldValueDayOfMonthEven({
        fieldValue: null,
        fieldType: 'DATE',
        userTimeZone: 'Europe/Kyiv',
      }),
    ).toBe(false);
  });
});
