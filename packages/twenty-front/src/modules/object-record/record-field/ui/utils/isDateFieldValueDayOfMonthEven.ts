import { isNonEmptyString } from '@sniptt/guards';
import { Temporal } from 'temporal-polyfill';

type IsDateFieldValueDayOfMonthEvenParams = {
  fieldValue: string | null | undefined;
  fieldType: 'DATE' | 'DATE_TIME';
  userTimeZone: string;
};

export const isDateFieldValueDayOfMonthEven = ({
  fieldValue,
  fieldType,
  userTimeZone,
}: IsDateFieldValueDayOfMonthEvenParams): boolean => {
  if (!isNonEmptyString(fieldValue)) {
    return false;
  }

  try {
    const dayOfMonth =
      fieldType === 'DATE'
        ? Temporal.PlainDate.from(fieldValue.split('T')[0]).day
        : Temporal.Instant.from(fieldValue).toZonedDateTimeISO(userTimeZone)
            .day;

    return dayOfMonth % 2 === 0;
  } catch {
    return false;
  }
};
