import { Temporal } from 'temporal-polyfill';

// Next calendar day; if that day is Saturday or Sunday, use the following Monday.
export const getNextBusinessDayPlainDate = (
  referenceDate: Temporal.PlainDate,
): Temporal.PlainDate => {
  const nextDay = referenceDate.add({ days: 1 });

  if (nextDay.dayOfWeek === 6) {
    return nextDay.add({ days: 2 });
  }

  if (nextDay.dayOfWeek === 7) {
    return nextDay.add({ days: 1 });
  }

  return nextDay;
};
