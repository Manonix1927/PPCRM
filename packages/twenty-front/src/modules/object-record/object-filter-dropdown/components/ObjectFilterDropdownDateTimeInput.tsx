import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { CalendarStartDay } from 'twenty-shared/constants';

import { detectCalendarStartDay } from '@/localization/utils/detection/detectCalendarStartDay';
import { useApplyObjectFilterDropdownFilterValue } from '@/object-record/object-filter-dropdown/hooks/useApplyObjectFilterDropdownFilterValue';
import { objectFilterDropdownCurrentRecordFilterComponentState } from '@/object-record/object-filter-dropdown/states/objectFilterDropdownCurrentRecordFilterComponentState';
import { getRelativeDateDisplayValue } from '@/object-record/object-filter-dropdown/utils/getRelativeDateDisplayValue';
import { DateTimePicker } from '@/ui/input/components/internal/date/components/DateTimePicker';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { UserContext } from '@/users/contexts/UserContext';
import { stringifyRelativeDateFilter } from '@/views/view-filter-value/utils/stringifyRelativeDateFilter';
import { useContext, useState } from 'react';
import { ViewFilterOperand, type FirstDayOfTheWeek } from 'twenty-shared/types';
import {
  dateRangeFilterValueSchema,
  isDefined,
  resolveDateTimeFilter,
  type RelativeDateFilter,
} from 'twenty-shared/utils';

import { useUserTimezone } from '@/ui/input/components/internal/date/hooks/useUserTimezone';
import { isNonEmptyString } from '@sniptt/guards';
import { Temporal } from 'temporal-polyfill';
import { dateLocaleState } from '~/localization/states/dateLocaleState';
import { formatDateString } from '~/utils/string/formatDateString';
import { formatDateTimeString } from '~/utils/string/formatDateTimeString';

export const ObjectFilterDropdownDateTimeInput = () => {
  const { dateFormat, timeFormat, timeZone } = useContext(UserContext);
  const dateLocale = useAtomStateValue(dateLocaleState);
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);

  const { userTimezone } = useUserTimezone();

  const objectFilterDropdownCurrentRecordFilter = useAtomComponentStateValue(
    objectFilterDropdownCurrentRecordFilterComponentState,
  );

  const { applyObjectFilterDropdownFilterValue } =
    useApplyObjectFilterDropdownFilterValue();

  const handleAbsoluteDateChange = (newDate: Temporal.ZonedDateTime | null) => {
    const newFilterValue = newDate?.toInstant().toString() ?? '';

    const formattedDateTime = formatDateTimeString({
      value: newFilterValue,
      timeZone,
      dateFormat,
      timeFormat,
      localeCatalog: dateLocale.localeCatalog,
    });

    const newDisplayValue = isDefined(newDate) ? formattedDateTime : '';

    applyObjectFilterDropdownFilterValue(newFilterValue, newDisplayValue);
  };

  const handleRelativeDateChange = (
    relativeDate: RelativeDateFilter | null,
  ) => {
    const userDefinedCalendarStartDay =
      CalendarStartDay[
        currentWorkspaceMember?.calendarStartDay ?? CalendarStartDay.SYSTEM
      ];
    const defaultSystemCalendarStartDay = detectCalendarStartDay();

    const resolvedCalendarStartDay = (
      userDefinedCalendarStartDay === CalendarStartDay[CalendarStartDay.SYSTEM]
        ? defaultSystemCalendarStartDay
        : userDefinedCalendarStartDay
    ) as FirstDayOfTheWeek;

    const newFilterValue = relativeDate
      ? stringifyRelativeDateFilter({
          ...relativeDate,
          timezone: timeZone,
          firstDayOfTheWeek: resolvedCalendarStartDay,
        })
      : '';

    const newDisplayValue = relativeDate
      ? getRelativeDateDisplayValue(relativeDate)
      : '';

    applyObjectFilterDropdownFilterValue(newFilterValue, newDisplayValue);
  };

  const resolvedValue = objectFilterDropdownCurrentRecordFilter
    ? resolveDateTimeFilter(objectFilterDropdownCurrentRecordFilter)
    : null;

  const isRelativeDateFilter =
    objectFilterDropdownCurrentRecordFilter?.operand ===
      ViewFilterOperand.IS_RELATIVE &&
    isDefined(resolvedValue) &&
    typeof resolvedValue === 'object';

  const isBetweenOperand =
    objectFilterDropdownCurrentRecordFilter?.operand ===
    ViewFilterOperand.IS_BETWEEN;

  const pickedRange = isBetweenOperand
    ? dateRangeFilterValueSchema.safeParse(
        objectFilterDropdownCurrentRecordFilter?.value ?? '',
      )
    : undefined;

  const [pendingRangeStart, setPendingRangeStart] = useState<string | null>(
    null,
  );

  // A pending start means the range is still open, so the end is withheld to
  // keep the calendar in range-completion mode.
  const pickedRangeStart =
    pendingRangeStart ??
    (pickedRange?.success ? pickedRange.data.start : undefined);
  const pickedRangeEnd = isDefined(pendingRangeStart)
    ? undefined
    : pickedRange?.success
      ? pickedRange.data.end
      : undefined;

  // The filter value can only hold a complete range, so the first click is held
  // here instead. Committing it early would hand the calendar a closed range,
  // and the next click would open a new one rather than close this one.
  const handleRangeChange = ({
    start,
    end,
  }: {
    start: string | null;
    end: string | null;
  }) => {
    if (!isDefined(start)) {
      setPendingRangeStart(null);
      applyObjectFilterDropdownFilterValue('', '');

      return;
    }

    if (!isDefined(end)) {
      setPendingRangeStart(start);
      applyObjectFilterDropdownFilterValue('', '');

      return;
    }

    const formatPickedDate = (plainDate: string) =>
      formatDateString({
        value: plainDate,
        timeZone,
        dateFormat,
        localeCatalog: dateLocale.localeCatalog,
      });

    setPendingRangeStart(null);
    applyObjectFilterDropdownFilterValue(
      JSON.stringify({ start, end }),
      `${formatPickedDate(start)} - ${formatPickedDate(end)}`,
    );
  };

  const relativeDate = isRelativeDateFilter ? resolvedValue : undefined;
  const stringFilterValue =
    objectFilterDropdownCurrentRecordFilter?.operand !==
      ViewFilterOperand.IS_RELATIVE && typeof resolvedValue === 'string'
      ? resolvedValue
      : undefined;

  // Switching operands keeps the previous filter value around, so the string
  // can briefly belong to another operand's format (a serialized range, say).
  const parseFilterValueToZonedDateTime = (value: string) => {
    try {
      return value.includes('T')
        ? Temporal.Instant.from(value).toZonedDateTimeISO(
            timeZone ?? userTimezone,
          )
        : Temporal.PlainDate.from(value).toZonedDateTime(
            timeZone ?? userTimezone,
          );
    } catch {
      return null;
    }
  };

  const internalZonedDateTime =
    !isRelativeDateFilter &&
    !isBetweenOperand &&
    isNonEmptyString(stringFilterValue)
      ? parseFilterValueToZonedDateTime(stringFilterValue)
      : null;

  return (
    <DateTimePicker
      instanceId={`object-filter-dropdown-date-time-input`}
      relativeDate={relativeDate}
      isRelative={isRelativeDateFilter}
      isRange={isBetweenOperand}
      rangeStartPlainDateString={pickedRangeStart ?? null}
      rangeEndPlainDateString={pickedRangeEnd ?? null}
      onRangeChange={handleRangeChange}
      hideHeaderInput={isBetweenOperand}
      date={internalZonedDateTime}
      onChange={handleAbsoluteDateChange}
      onRelativeDateChange={handleRelativeDateChange}
      clearable={false}
    />
  );
};
