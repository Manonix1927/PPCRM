import { SKELETON_LOADER_HEIGHT_SIZES } from '@/activities/components/SkeletonLoader';
import {
  convertFirstDayOfTheWeekToCalendarStartDayNumber,
  isDefined,
  isSubDayRelativeDateFilterUnit,
  turnJSDateToPlainDate,
  type RelativeDateFilter,
} from 'twenty-shared/utils';

import {
  DATE_TIME_PICKER_MONTH_YEAR_PANEL_DROPDOWN_ID,
  DateTimePickerHeader,
} from '@/ui/input/components/internal/date/components/DateTimePickerHeader';
import { DateRangePickerHeader } from '@/ui/input/components/internal/date/components/DateRangePickerHeader';
import { RelativeDatePickerHeader } from '@/ui/input/components/internal/date/components/RelativeDatePickerHeader';
import { RelativeDateTimeRangeText } from '@/ui/input/components/internal/date/components/RelativeDateTimeRangeText';
import { StyledDatePickerContainer } from '@/ui/input/components/internal/date/components/StyledDatePickerContainer';
import { getRelativeDatePickerCalendarRange } from '@/ui/input/components/internal/date/utils/getRelativeDatePickerCalendarRange';
import { useCloseDropdown } from '@/ui/layout/dropdown/hooks/useCloseDropdown';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { lazy, Suspense, useContext, type ComponentType } from 'react';
import type { DatePickerProps as ReactDatePickerLibProps } from 'react-datepicker';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import 'react-datepicker/dist/react-datepicker.css';

import { IconCalendarX } from 'twenty-ui/icon';
import { MenuItemLeftContent } from 'twenty-ui/navigation';

import { useGetShiftedDateToSystemTimeZone } from '@/ui/input/components/internal/date/hooks/useGetShiftedDateToSystemTimeZone';
import { useUserFirstDayOfTheWeek } from '@/ui/input/components/internal/date/hooks/useUserFirstDayOfTheWeek';
import { useUserTimezone } from '@/ui/input/components/internal/date/hooks/useUserTimezone';
import { Temporal } from 'temporal-polyfill';

export {
  MONTH_AND_YEAR_DROPDOWN_MONTH_SELECT_ID,
  MONTH_AND_YEAR_DROPDOWN_YEAR_SELECT_ID,
} from '@/ui/input/components/internal/date/components/DatePicker';
export { DATE_TIME_PICKER_MONTH_YEAR_PANEL_DROPDOWN_ID } from '@/ui/input/components/internal/date/components/DateTimePickerHeader';

import { ThemeContext, themeCssVariables } from 'twenty-ui/theme-constants';

const StyledOuterWrapper = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: row;
  position: relative;
  width: 280px;
`;

const StyledSeparator = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  width: 100%;
`;

const StyledButtonContainer = styled.div`
  align-items: center;
  border-radius: calc(
    ${themeCssVariables.border.radius.md} - ${themeCssVariables.spacing[1]}
  );
  box-sizing: border-box;
  cursor: pointer;
  display: flex;
  height: 32px;
  margin: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]};
  width: auto;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledButtonContent = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: start;
`;

const StyledDatePickerFallback = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.secondary};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  height: 300px;
  justify-content: center;
  padding: ${themeCssVariables.spacing[4]};
  width: 280px;
`;

type DateTimePickerProps = {
  instanceId: string;
  isRelative?: boolean;
  hideHeaderInput?: boolean;
  date: Temporal.ZonedDateTime | null;
  relativeDate?: RelativeDateFilter & {
    start: Temporal.ZonedDateTime;
    end?: Temporal.ZonedDateTime;
  };
  onClose?: (date: Temporal.ZonedDateTime | null) => void;
  onChange?: (date: Temporal.ZonedDateTime | null) => void;
  onRelativeDateChange?: (
    relativeDateFilter: RelativeDateFilter | null,
  ) => void;
  clearable?: boolean;
  onEnter?: (date: Temporal.ZonedDateTime | null) => void;
  onEscape?: (date: Temporal.ZonedDateTime | null) => void;
  keyboardEventsDisabled?: boolean;
  onClear?: () => void;
  timeZone?: string;
  isRange?: boolean;
  rangeStartPlainDateString?: string | null;
  rangeEndPlainDateString?: string | null;
  onRangeChange?: (range: { start: string | null; end: string | null }) => void;
};

// react-datepicker v9 types its props as a discriminated union keyed on
// selectsRange/selectsMultiple. We drive selectsRange dynamically (relative
// filters highlight a contiguous range), which TS cannot narrow to a single
// union branch, so collapse the discriminants to plain optionals.
type DatePickerPropsType = Omit<
  ReactDatePickerLibProps,
  'selectsRange' | 'selectsMultiple' | 'onChange' | 'formatMultipleDates'
> & {
  selectsRange?: boolean;
  onChange?: (date: Date | null) => void;
};

const ReactDatePicker = lazy<ComponentType<DatePickerPropsType>>(() =>
  import('react-datepicker').then((mod) => ({
    // react-datepicker ships CJS; under vite 8 this dynamic import's `default`
    // can be the module namespace ({ default: Component }) rather than the
    // component itself, so unwrap a nested default when present.
    default: ((mod.default as any)?.default ??
      mod.default) as unknown as ComponentType<DatePickerPropsType>,
  })),
);

export const DateTimePicker = ({
  instanceId,
  date,
  onChange,
  onClose,
  clearable = true,
  onClear,
  isRelative,
  relativeDate,
  onRelativeDateChange,
  hideHeaderInput,
  timeZone,
  isRange,
  rangeStartPlainDateString,
  rangeEndPlainDateString,
  onRangeChange,
}: DateTimePickerProps) => {
  const { theme } = useContext(ThemeContext);
  const { userFirstDayOfTheWeek } = useUserFirstDayOfTheWeek();

  const { userTimezone } = useUserTimezone();

  const dateToUse =
    date ?? Temporal.Now.zonedDateTimeISO(timeZone ?? userTimezone);

  const { closeDropdown: closeMonthYearPanel } = useCloseDropdown();

  const { getShiftedDateToSystemTimeZone } =
    useGetShiftedDateToSystemTimeZone();

  const getZonedDateTimeFromDatePicked = (datePicked: Date) => {
    const plainDatePart = Temporal.PlainDate.from({
      day: datePicked.getDate(),
      month: datePicked.getMonth() + 1,
      year: datePicked.getFullYear(),
    });

    const zonedDateTime = plainDatePart
      .toZonedDateTime(timeZone ?? userTimezone)
      .with({
        hour: dateToUse?.hour ?? 0,
        minute: dateToUse?.minute ?? 0,
      });

    return { zonedDateTime };
  };

  const handleClear = () => {
    closeMonthYearPanel(DATE_TIME_PICKER_MONTH_YEAR_PANEL_DROPDOWN_ID);
    onClear?.();
  };

  const handleClose = (newDate: Temporal.ZonedDateTime) => {
    closeMonthYearPanel(DATE_TIME_PICKER_MONTH_YEAR_PANEL_DROPDOWN_ID);
    onClose?.(newDate);
  };

  const handleChangeMonth = (month: number) => {
    const newZonedDateTime = dateToUse?.with({ month: month }) ?? null;

    onChange?.(newZonedDateTime);
  };

  const handleAddMonth = () => {
    const newZonedDateTime = dateToUse?.add({ months: 1 }) ?? null;

    onChange?.(newZonedDateTime);
  };

  const handleSubtractMonth = () => {
    const newZonedDateTime = dateToUse?.subtract({ months: 1 }) ?? null;

    onChange?.(newZonedDateTime);
  };

  const handleChangeYear = (year: number) => {
    const newZonedDateTime = dateToUse?.with({ year: year }) ?? null;

    onChange?.(newZonedDateTime);
  };

  // react-datepicker hands back a [start, end] tuple once selectsRange is on,
  // which the collapsed prop type above cannot express.
  const handleDateChange = (
    newDate: Date | null | [Date | null, Date | null],
  ) => {
    if (Array.isArray(newDate)) {
      const [rangeStart, rangeEnd] = newDate;

      onRangeChange?.({
        start: isDefined(rangeStart)
          ? turnJSDateToPlainDate(rangeStart).toString()
          : null,
        end: isDefined(rangeEnd)
          ? turnJSDateToPlainDate(rangeEnd).toString()
          : null,
      });

      return;
    }

    if (!isDefined(newDate)) {
      return;
    }
    const { zonedDateTime } = getZonedDateTimeFromDatePicked(newDate);

    onChange?.(zonedDateTime);
  };

  const handleRangeStartChange = (plainDateString: string | null) => {
    onRangeChange?.({
      start: plainDateString,
      end: rangeEndPlainDateString ?? null,
    });
  };

  const handleRangeEndChange = (plainDateString: string | null) => {
    onRangeChange?.({
      start: rangeStartPlainDateString ?? null,
      end: plainDateString,
    });
  };

  const handleDateSelect = (newDate: Date | null) => {
    // In range mode the first click only opens the range, so closing here would
    // dismiss the calendar before the second date can be picked.
    if (isRange || !isDefined(newDate)) {
      return;
    }
    const { zonedDateTime } = getZonedDateTimeFromDatePicked(newDate);

    handleClose?.(zonedDateTime);
  };

  const relativeUnit = relativeDate?.unit ?? 'DAY';
  const relativeRangeStart = isRelative ? relativeDate?.start : undefined;
  const relativeRangeEnd = isRelative ? relativeDate?.end : undefined;

  const isSubDayRelativeUnit =
    isRelative === true && isSubDayRelativeDateFilterUnit(relativeUnit);

  const relativeRangeStartPlainDate = isDefined(relativeRangeStart)
    ? relativeRangeStart.toPlainDate()
    : null;

  const relativeRangeEndPlainDate = isDefined(relativeRangeEnd)
    ? relativeRangeEnd.subtract({ nanoseconds: 1 }).toPlainDate()
    : null;

  const {
    startDate: relativeRangeStartDate,
    endDate: relativeRangeEndDate,
    rangeKey: relativeDateRangeKey,
  } = getRelativeDatePickerCalendarRange(
    relativeRangeStartPlainDate,
    relativeRangeEndPlainDate,
  );

  const nonShiftedDateForReactDatePicker = new Date(
    dateToUse.toInstant().toString(),
  );

  const shiftedDateForReactDatePicker = getShiftedDateToSystemTimeZone(
    nonShiftedDateForReactDatePicker,
    timeZone ?? userTimezone,
  );

  // The range is picked as calendar days, so it is rendered from plain dates in
  // the system time zone rather than through the field's own zone shift.
  const turnRangeBoundToDate = (plainDateString: string | null | undefined) =>
    isDefined(plainDateString) ? new Date(`${plainDateString}T00:00:00`) : null;

  const pickedRangeStartDate = turnRangeBoundToDate(rangeStartPlainDateString);
  const pickedRangeEndDate = turnRangeBoundToDate(rangeEndPlainDateString);

  const calendarStartDayNumber =
    convertFirstDayOfTheWeekToCalendarStartDayNumber(userFirstDayOfTheWeek);

  return (
    <StyledOuterWrapper>
      <StyledDatePickerContainer
        calendarDisabled={isRelative && !isSubDayRelativeUnit}
      >
        {isSubDayRelativeUnit ? (
          <>
            <RelativeDatePickerHeader
              instanceId={instanceId}
              direction={relativeDate?.direction ?? 'PAST'}
              amount={relativeDate?.amount}
              unit={relativeUnit}
              onChange={onRelativeDateChange}
              allowIntraDayUnits={true}
            />
            {isDefined(relativeRangeStart) && isDefined(relativeRangeEnd) && (
              <RelativeDateTimeRangeText
                start={relativeRangeStart}
                end={relativeRangeEnd}
              />
            )}
          </>
        ) : (
          <Suspense
            fallback={
              <StyledDatePickerFallback>
                <SkeletonTheme
                  baseColor={theme.background.tertiary}
                  highlightColor={theme.background.transparent.lighter}
                  borderRadius={4}
                >
                  <Skeleton
                    width={200}
                    height={SKELETON_LOADER_HEIGHT_SIZES.standard.m}
                  />
                  <Skeleton
                    width={240}
                    height={SKELETON_LOADER_HEIGHT_SIZES.standard.l}
                  />
                  <Skeleton
                    width={220}
                    height={SKELETON_LOADER_HEIGHT_SIZES.standard.m}
                  />
                  <Skeleton
                    width={180}
                    height={SKELETON_LOADER_HEIGHT_SIZES.standard.s}
                  />
                </SkeletonTheme>
              </StyledDatePickerFallback>
            }
          >
            <ReactDatePicker
              key={relativeDateRangeKey}
              open={true}
              disabledKeyboardNavigation
              onChange={handleDateChange}
              onSelect={handleDateSelect}
              // Pinning the month in range mode would undo every navigation, so
              // the calendar drives its own month once a range is being picked.
              openToDate={
                isRelative
                  ? relativeRangeStartDate
                  : isRange
                    ? undefined
                    : shiftedDateForReactDatePicker
              }
              selectsRange={isRelative || isRange ? true : undefined}
              startDate={
                isRelative
                  ? relativeRangeStartDate
                  : (pickedRangeStartDate ?? undefined)
              }
              endDate={
                isRelative
                  ? relativeRangeEndDate
                  : (pickedRangeEndDate ?? undefined)
              }
              selected={
                isRelative || isRange
                  ? undefined
                  : shiftedDateForReactDatePicker
              }
              calendarStartDay={
                calendarStartDayNumber as 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
              }
              renderCustomHeader={({
                monthDate,
                changeMonth,
                changeYear,
                decreaseMonth,
                increaseMonth,
                prevMonthButtonDisabled,
                nextMonthButtonDisabled,
              }) =>
                isRange ? (
                  <DateRangePickerHeader
                    rangeStartPlainDateString={
                      rangeStartPlainDateString ?? null
                    }
                    rangeEndPlainDateString={rangeEndPlainDateString ?? null}
                    onRangeStartChange={handleRangeStartChange}
                    onRangeEndChange={handleRangeEndChange}
                    visibleMonthPlainDateString={turnJSDateToPlainDate(
                      monthDate,
                    ).toString()}
                    // react-datepicker counts months from zero, the select from one.
                    onChangeMonth={(month) => changeMonth(month - 1)}
                    onChangeYear={changeYear}
                    onAddMonth={increaseMonth}
                    onSubtractMonth={decreaseMonth}
                    prevMonthButtonDisabled={prevMonthButtonDisabled}
                    nextMonthButtonDisabled={nextMonthButtonDisabled}
                  />
                ) : isRelative ? (
                  <RelativeDatePickerHeader
                    instanceId={instanceId}
                    direction={relativeDate?.direction ?? 'PAST'}
                    amount={relativeDate?.amount}
                    unit={relativeUnit}
                    onChange={onRelativeDateChange}
                    allowIntraDayUnits={true}
                    calendarMonthDate={monthDate}
                    onPreviousMonth={decreaseMonth}
                    onNextMonth={increaseMonth}
                    prevMonthButtonDisabled={prevMonthButtonDisabled}
                    nextMonthButtonDisabled={nextMonthButtonDisabled}
                  />
                ) : (
                  <DateTimePickerHeader
                    date={dateToUse}
                    onChange={onChange}
                    onAddMonth={handleAddMonth}
                    onSubtractMonth={handleSubtractMonth}
                    prevMonthButtonDisabled={prevMonthButtonDisabled}
                    nextMonthButtonDisabled={nextMonthButtonDisabled}
                    hideInput={hideHeaderInput}
                    onChangeMonth={handleChangeMonth}
                    onChangeYear={handleChangeYear}
                  />
                )
              }
            />
          </Suspense>
        )}
        {clearable && (
          <>
            <StyledSeparator />
            <StyledButtonContainer onClick={handleClear}>
              <StyledButtonContent>
                <MenuItemLeftContent LeftIcon={IconCalendarX} text={t`Clear`} />
              </StyledButtonContent>
            </StyledButtonContainer>
          </>
        )}
      </StyledDatePickerContainer>
    </StyledOuterWrapper>
  );
};
