import { type ReactNode } from 'react';
import { Temporal } from 'temporal-polyfill';
import { type Nullable } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { DatePickerCalendar } from '@/ui/input/components/internal/date/components/DatePickerCalendar';
import { DateRangePickerHeader } from '@/ui/input/components/internal/date/components/DateRangePickerHeader';

export type DateRange = { start: string | null; end: string | null };

type DateRangePickerCalendarProps = {
  instanceId: string;
  rangeStartPlainDateString?: Nullable<string>;
  rangeEndPlainDateString?: Nullable<string>;
  onRangeChange?: (range: DateRange) => void;
  weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  loadingFallback?: ReactNode;
};

export const DateRangePickerCalendar = ({
  instanceId,
  rangeStartPlainDateString,
  rangeEndPlainDateString,
  onRangeChange,
  weekStart,
  loadingFallback,
}: DateRangePickerCalendarProps) => {
  const rangeStart = rangeStartPlainDateString ?? null;
  const rangeEnd = rangeEndPlainDateString ?? null;

  const highlightedRange = isDefined(rangeStart)
    ? { start: rangeStart, end: rangeEnd ?? rangeStart }
    : undefined;

  // The first click opens the range and the second one closes it; a click
  // before the open start, or once the range is complete, starts a new one.
  const handleSelect = (datePicked: string) => {
    if (
      !isDefined(rangeStart) ||
      isDefined(rangeEnd) ||
      Temporal.PlainDate.compare(datePicked, rangeStart) < 0
    ) {
      onRangeChange?.({ start: datePicked, end: null });

      return;
    }

    onRangeChange?.({ start: rangeStart, end: datePicked });
  };

  return (
    <DatePickerCalendar
      loadingFallback={loadingFallback}
      value={null}
      onSelect={handleSelect}
      highlightedRange={highlightedRange}
      weekStart={weekStart}
      renderHeader={(header) => (
        <DateRangePickerHeader
          instanceId={instanceId}
          rangeStartPlainDateString={rangeStart}
          rangeEndPlainDateString={rangeEnd}
          onRangeStartChange={(start) =>
            onRangeChange?.({ start, end: rangeEnd })
          }
          onRangeEndChange={(end) => onRangeChange?.({ start: rangeStart, end })}
          viewedMonth={header.viewedMonth}
          onChangeMonth={header.onMonthChange}
          onChangeYear={header.onYearChange}
          onAddMonth={header.onNextMonth}
          onSubtractMonth={header.onPreviousMonth}
          prevMonthButtonDisabled={header.isPreviousMonthDisabled}
          nextMonthButtonDisabled={header.isNextMonthDisabled}
        />
      )}
    />
  );
};
