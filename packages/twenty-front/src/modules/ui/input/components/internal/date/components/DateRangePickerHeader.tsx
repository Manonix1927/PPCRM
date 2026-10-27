import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';

import { DatePickerHeader } from '@/ui/input/components/internal/date/components/DatePickerHeader';
import { DatePickerInput } from '@/ui/input/components/internal/date/components/DatePickerInput';
import { themeCssVariables } from 'twenty-ui/theme';

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

type DateRangePickerHeaderProps = {
  instanceId: string;
  rangeStartPlainDateString: string | null;
  rangeEndPlainDateString: string | null;
  onRangeStartChange: (plainDateString: string | null) => void;
  onRangeEndChange: (plainDateString: string | null) => void;
  viewedMonth: string;
  onChangeMonth: (month: number) => void;
  onChangeYear: (year: number) => void;
  onAddMonth: () => void;
  onSubtractMonth: () => void;
  prevMonthButtonDisabled: boolean;
  nextMonthButtonDisabled: boolean;
};

export const DateRangePickerHeader = ({
  instanceId,
  rangeStartPlainDateString,
  rangeEndPlainDateString,
  onRangeStartChange,
  onRangeEndChange,
  viewedMonth,
  onChangeMonth,
  onChangeYear,
  onAddMonth,
  onSubtractMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
}: DateRangePickerHeaderProps) => (
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
    <DatePickerHeader
      instanceId={instanceId}
      date={null}
      viewedMonth={viewedMonth}
      onChangeMonth={onChangeMonth}
      onChangeYear={onChangeYear}
      onAddMonth={onAddMonth}
      onSubtractMonth={onSubtractMonth}
      prevMonthButtonDisabled={prevMonthButtonDisabled}
      nextMonthButtonDisabled={nextMonthButtonDisabled}
      hideInput
    />
  </>
);
