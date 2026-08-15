import { styled } from '@linaria/react';

import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { Select } from '@/ui/input/components/Select';
import { DatePickerInput } from '@/ui/input/components/internal/date/components/DatePickerInput';
import { getMonthSelectOptions } from '@/ui/input/components/internal/date/utils/getMonthSelectOptions';
import { ClickOutsideListenerContext } from '@/ui/utilities/pointer-event/contexts/ClickOutsideListenerContext';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { t } from '@lingui/core/macro';
import { Temporal } from 'temporal-polyfill';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { isDefined } from 'twenty-shared/utils';
import { IconChevronLeft, IconChevronRight } from 'twenty-ui/icon';
import { LightIconButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const MONTH_AND_YEAR_DROPDOWN_MONTH_SELECT_ID =
  'date-range-picker-month-and-year-dropdown-month-select';
const MONTH_AND_YEAR_DROPDOWN_YEAR_SELECT_ID =
  'date-range-picker-month-and-year-dropdown-year-select';
const YEARS_SELECT_OPTIONS = Array.from(
  { length: 200 },
  (_, i) => new Date().getFullYear() + 50 - i,
).map((year) => ({ label: year.toString(), value: year }));

const StyledRangeInputs = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
`;

const StyledRangeInput = styled.div`
  align-items: center;
  display: flex;
  flex: 1;
  min-width: 0;

  &:first-of-type {
    border-right: 1px solid ${themeCssVariables.border.color.light};
  }
`;

const StyledRangeInputLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  padding-left: ${themeCssVariables.spacing[2]};
`;

const StyledCustomDatePickerHeader = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  justify-content: flex-end;
  padding-left: ${themeCssVariables.spacing[2]};
  padding-right: ${themeCssVariables.spacing[2]};
  padding-top: ${themeCssVariables.spacing[2]};
`;

type DateRangePickerHeaderProps = {
  rangeStartPlainDateString: string | null;
  rangeEndPlainDateString: string | null;
  onRangeStartChange: (plainDateString: string | null) => void;
  onRangeEndChange: (plainDateString: string | null) => void;
  visibleMonthPlainDateString: string;
  onChangeMonth: (month: number) => void;
  onChangeYear: (year: number) => void;
  onAddMonth: () => void;
  onSubtractMonth: () => void;
  prevMonthButtonDisabled: boolean;
  nextMonthButtonDisabled: boolean;
};

export const DateRangePickerHeader = ({
  rangeStartPlainDateString,
  rangeEndPlainDateString,
  onRangeStartChange,
  onRangeEndChange,
  visibleMonthPlainDateString,
  onChangeMonth,
  onChangeYear,
  onAddMonth,
  onSubtractMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
}: DateRangePickerHeaderProps) => {
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const userLocale = currentWorkspaceMember?.locale ?? SOURCE_LOCALE;

  const visibleMonth = isDefined(visibleMonthPlainDateString)
    ? Temporal.PlainDate.from(visibleMonthPlainDateString)
    : null;

  return (
    <>
      <StyledRangeInputs>
        <StyledRangeInput>
          <StyledRangeInputLabel>{t`Start date`}</StyledRangeInputLabel>
          <DatePickerInput
            date={rangeStartPlainDateString}
            onChange={onRangeStartChange}
          />
        </StyledRangeInput>
        <StyledRangeInput>
          <StyledRangeInputLabel>{t`End date`}</StyledRangeInputLabel>
          <DatePickerInput
            date={rangeEndPlainDateString}
            onChange={onRangeEndChange}
          />
        </StyledRangeInput>
      </StyledRangeInputs>
      <StyledCustomDatePickerHeader>
        <ClickOutsideListenerContext.Provider
          value={{
            excludedClickOutsideId: MONTH_AND_YEAR_DROPDOWN_MONTH_SELECT_ID,
          }}
        >
          <Select
            dropdownId={MONTH_AND_YEAR_DROPDOWN_MONTH_SELECT_ID}
            options={getMonthSelectOptions(userLocale)}
            onChange={onChangeMonth}
            value={visibleMonth?.month}
            fullWidth
          />
        </ClickOutsideListenerContext.Provider>
        <ClickOutsideListenerContext.Provider
          value={{
            excludedClickOutsideId: MONTH_AND_YEAR_DROPDOWN_YEAR_SELECT_ID,
          }}
        >
          <Select
            dropdownId={MONTH_AND_YEAR_DROPDOWN_YEAR_SELECT_ID}
            onChange={onChangeYear}
            value={visibleMonth?.year}
            options={YEARS_SELECT_OPTIONS}
            fullWidth
          />
        </ClickOutsideListenerContext.Provider>
        <LightIconButton
          Icon={IconChevronLeft}
          onClick={onSubtractMonth}
          size="medium"
          disabled={prevMonthButtonDisabled}
        />
        <LightIconButton
          Icon={IconChevronRight}
          onClick={onAddMonth}
          size="medium"
          disabled={nextMonthButtonDisabled}
        />
      </StyledCustomDatePickerHeader>
    </>
  );
};
