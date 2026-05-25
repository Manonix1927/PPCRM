import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { isFieldDate } from '@/object-record/record-field/ui/types/guards/isFieldDate';
import { isFieldDateTime } from '@/object-record/record-field/ui/types/guards/isFieldDateTime';
import { type FieldDefinition } from '@/object-record/record-field/ui/types/FieldDefinition';
import { type FieldMetadata } from '@/object-record/record-field/ui/types/FieldMetadata';
import { isDateFieldValueDayOfMonthEven } from '@/object-record/record-field/ui/utils/isDateFieldValueDayOfMonthEven';
import { useRecordFieldValue } from '@/object-record/record-store/hooks/useRecordFieldValue';
import { UserContext } from '@/users/contexts/UserContext';
import { useContext } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { ThemeContext } from 'twenty-ui/theme-constants';

const recordTableCellBackgroundFallbackFieldDefinition: FieldDefinition<FieldMetadata> =
  {
    type: 'TEXT',
    iconName: '',
    fieldMetadataId: '',
    label: '',
    metadata: {
      fieldName: '',
      objectMetadataNameSingular: '',
    },
  };

export const useRecordTableCellBackgroundColor = ({
  isSelected,
}: {
  isSelected?: boolean;
}) => {
  const { theme } = useContext(ThemeContext);
  const { timeZone } = useContext(UserContext);
  const fieldContext = useContext(FieldContext);

  const fieldDefinition =
    fieldContext.fieldDefinition ??
    recordTableCellBackgroundFallbackFieldDefinition;

  const isDateOrDateTimeField =
    isDefined(fieldContext.recordId) &&
    (isFieldDate(fieldDefinition) || isFieldDateTime(fieldDefinition));

  const fieldName = fieldDefinition.metadata.fieldName;

  const fieldValue = useRecordFieldValue<string | undefined>(
    fieldContext.recordId ?? '',
    fieldName,
    fieldDefinition,
  );

  if (isSelected === true) {
    return theme.accent.quaternary;
  }

  if (!isDateOrDateTimeField) {
    return theme.background.primary;
  }

  const fieldType = fieldDefinition.type;

  const hasEvenDayOfMonth = isDateFieldValueDayOfMonthEven({
    fieldValue,
    fieldType,
    userTimeZone: timeZone,
  });

  if (hasEvenDayOfMonth) {
    return theme.background.secondary;
  }

  return theme.background.primary;
};
