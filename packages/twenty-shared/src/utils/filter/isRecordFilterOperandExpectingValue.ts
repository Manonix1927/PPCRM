import { ViewFilterOperand } from '@/types';

export const isRecordFilterOperandExpectingValue = (
  operand: ViewFilterOperand,
): boolean => {
  switch (operand) {
    case ViewFilterOperand.IS_NOT_NULL:
    case ViewFilterOperand.IS_EMPTY:
    case ViewFilterOperand.IS_NOT_EMPTY:
    case ViewFilterOperand.IS_IN_PAST:
    case ViewFilterOperand.IS_IN_FUTURE:
    case ViewFilterOperand.IS_TODAY:
    case ViewFilterOperand.IS_YESTERDAY:
    case ViewFilterOperand.IS_TOMORROW:
    case ViewFilterOperand.IS_THIS_WEEK:
    case ViewFilterOperand.IS_LAST_WEEK:
    case ViewFilterOperand.IS_NEXT_WEEK:
    case ViewFilterOperand.IS_NEXT_BUSINESS_DAY:
    case ViewFilterOperand.IS_THIS_MONTH:
    case ViewFilterOperand.IS_LAST_MONTH:
    case ViewFilterOperand.IS_NEXT_MONTH:
      return false;
    default:
      return true;
  }
};
