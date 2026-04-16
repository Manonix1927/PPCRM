import { ViewFilterOperand } from '@/types/ViewFilterOperand';

import { isRecordFilterOperandExpectingValue } from '../isRecordFilterOperandExpectingValue';

describe('isRecordFilterOperandExpectingValue', () => {
  const operandsNotExpectingValue: ViewFilterOperand[] = [
    ViewFilterOperand.IS_NOT_NULL,
    ViewFilterOperand.IS_EMPTY,
    ViewFilterOperand.IS_NOT_EMPTY,
    ViewFilterOperand.IS_IN_PAST,
    ViewFilterOperand.IS_IN_FUTURE,
    ViewFilterOperand.IS_TODAY,
    ViewFilterOperand.IS_YESTERDAY,
    ViewFilterOperand.IS_TOMORROW,
    ViewFilterOperand.IS_THIS_WEEK,
    ViewFilterOperand.IS_LAST_WEEK,
    ViewFilterOperand.IS_NEXT_WEEK,
  ];

  const operandsExpectingValue: ViewFilterOperand[] = [
    ViewFilterOperand.IS,
    ViewFilterOperand.IS_NOT,
    ViewFilterOperand.CONTAINS,
    ViewFilterOperand.DOES_NOT_CONTAIN,
    ViewFilterOperand.GREATER_THAN_OR_EQUAL,
    ViewFilterOperand.LESS_THAN_OR_EQUAL,
    ViewFilterOperand.IS_BEFORE,
    ViewFilterOperand.IS_AFTER,
    ViewFilterOperand.IS_RELATIVE,
    ViewFilterOperand.VECTOR_SEARCH,
  ];

  it.each(operandsNotExpectingValue)(
    'should return false for %s',
    (operand) => {
      expect(isRecordFilterOperandExpectingValue(operand)).toBe(false);
    },
  );

  it.each(operandsExpectingValue)('should return true for %s', (operand) => {
    expect(isRecordFilterOperandExpectingValue(operand)).toBe(true);
  });

  it('should cover all ViewFilterOperand values', () => {
    const allOperands = Object.values(ViewFilterOperand);
    const coveredOperands = [
      ...operandsNotExpectingValue,
      ...operandsExpectingValue,
    ];

    expect(coveredOperands.sort()).toEqual(allOperands.sort());
  });
});
