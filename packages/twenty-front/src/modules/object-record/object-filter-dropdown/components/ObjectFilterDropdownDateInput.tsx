import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { CalendarStartDay } from 'twenty-shared/constants';

import { detectCalendarStartDay } from '@/localization/utils/detection/detectCalendarStartDay';
import { useApplyObjectFilterDropdownFilterValue } from '@/object-record/object-filter-dropdown/hooks/useApplyObjectFilterDropdownFilterValue';
import { objectFilterDropdownCurrentRecordFilterComponentState } from '@/object-record/object-filter-dropdown/states/objectFilterDropdownCurrentRecordFilterComponentState';
import { selectedOperandInDropdownComponentState } from '@/object-record/object-filter-dropdown/states/selectedOperandInDropdownComponentState';
import { getRelativeDateDisplayValue } from '@/object-record/object-filter-dropdown/utils/getRelativeDateDisplayValue';
import { DatePicker } from '@/ui/input/components/internal/date/components/DatePicker';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { UserContext } from '@/users/contexts/UserContext';
import { stringifyRelativeDateFilter } from '@/views/view-filter-value/utils/stringifyRelativeDateFilter';
import { useContext, useState } from 'react';
import { type FirstDayOfTheWeek, ViewFilterOperand } from 'twenty-shared/types';
import {
  dateRangeFilterValueSchema,
  isDefined,
  type RelativeDateFilter,
  resolveDateFilter,
} from 'twenty-shared/utils';
import { dateLocaleState } from '~/localization/states/dateLocaleState';
import { formatDateString } from '~/utils/string/formatDateString';

export const ObjectFilterDropdownDateInput = () => {
  const { dateFormat, timeZone } = useContext(UserContext);
  const dateLocale = useAtomStateValue(dateLocaleState);
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);

  const selectedOperandInDropdown = useAtomComponentStateValue(
    selectedOperandInDropdownComponentState,
  );

  const objectFilterDropdownCurrentRecordFilter = useAtomComponentStateValue(
    objectFilterDropdownCurrentRecordFilterComponentState,
  );

  const { applyObjectFilterDropdownFilterValue } =
    useApplyObjectFilterDropdownFilterValue();

  const handleAbsoluteDateChange = (newPlainDate: string | null) => {
    if (!isDefined(newPlainDate)) {
      applyObjectFilterDropdownFilterValue('', '');
      return;
    }

    const newFilterValue = newPlainDate;

    // TODO: remove this and use getDisplayValue instead
    const formattedDate = formatDateString({
      value: newPlainDate,
      timeZone,
      dateFormat,
      localeCatalog: dateLocale.localeCatalog,
    });

    const newDisplayValue = isDefined(newPlainDate) ? formattedDate : '';

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

  const isRelativeOperand =
    selectedOperandInDropdown === ViewFilterOperand.IS_RELATIVE;

  const isBetweenOperand =
    selectedOperandInDropdown === ViewFilterOperand.IS_BETWEEN;

  const pickedRange = isBetweenOperand
    ? dateRangeFilterValueSchema.safeParse(
        objectFilterDropdownCurrentRecordFilter?.value ?? '',
      )
    : undefined;

  // Held locally because the filter value can only store a complete range,
  // while either end can be empty midway through picking or typing one.
  const [draftRange, setDraftRange] = useState<{
    start: string | null;
    end: string | null;
  }>(() => ({
    start: pickedRange?.success ? pickedRange.data.start : null,
    end: pickedRange?.success ? pickedRange.data.end : null,
  }));

  const pickedRangeStart = draftRange.start ?? undefined;
  const pickedRangeEnd = draftRange.end ?? undefined;

  // Only a range with both ends can become a filter value; until then the
  // filter is left empty so no half-open range is applied.
  const handleRangeChange = ({
    start,
    end,
  }: {
    start: string | null;
    end: string | null;
  }) => {
    setDraftRange({ start, end });

    if (!isDefined(start) || !isDefined(end)) {
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

    applyObjectFilterDropdownFilterValue(
      JSON.stringify({ start, end }),
      `${formatPickedDate(start)} - ${formatPickedDate(end)}`,
    );
  };

  const handleClear = () => {
    if (isBetweenOperand) {
      setDraftRange({ start: null, end: null });
      applyObjectFilterDropdownFilterValue('', '');

      return;
    }

    isRelativeOperand
      ? handleRelativeDateChange(null)
      : handleAbsoluteDateChange(null);
  };

  const resolvedValue = objectFilterDropdownCurrentRecordFilter
    ? resolveDateFilter(objectFilterDropdownCurrentRecordFilter)
    : null;

  const relativeDate =
    isDefined(resolvedValue) && typeof resolvedValue === 'object'
      ? resolvedValue
      : undefined;

  const safePlainDateValue: string | undefined =
    isDefined(resolvedValue) && typeof resolvedValue === 'string'
      ? resolvedValue
      : undefined;

  return (
    <DatePicker
      instanceId={`object-filter-dropdown-date-input`}
      relativeDate={relativeDate}
      isRelative={isRelativeOperand}
      isRange={isBetweenOperand}
      rangeStartPlainDateString={pickedRangeStart ?? null}
      rangeEndPlainDateString={pickedRangeEnd ?? null}
      onRangeChange={handleRangeChange}
      hideHeaderInput={isBetweenOperand}
      plainDateString={isBetweenOperand ? null : (safePlainDateValue ?? null)}
      onChange={handleAbsoluteDateChange}
      onRelativeDateChange={handleRelativeDateChange}
      onClear={handleClear}
    />
  );
};
