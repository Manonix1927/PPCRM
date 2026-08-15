import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { getRelationObjectMetadataNameSingular } from '@/object-metadata/utils/formatFieldMetadataItemsAsFilterDefinitions';
import { getFieldMetadataItemByIdOrThrow } from '@/object-metadata/utils/getFieldMetadataItemByIdOrThrow';
import { MAX_RECORDS_TO_DISPLAY } from '@/object-record/object-filter-dropdown/components/ObjectFilterDropdownRecordSelect';
import { getJunctionConfig } from '@/object-record/record-field/ui/utils/junction/getJunctionConfig';
import { hasJunctionTargetFieldId } from '@/object-record/record-field/ui/utils/junction/hasJunctionTargetFieldId';
import { type RecordFilter } from '@/object-record/record-filter/types/RecordFilter';
import { useRecordsForSelect } from '@/object-record/select/hooks/useRecordsForSelect';

import { allowRequestsToTwentyIconsState } from '@/client-config/states/allowRequestsToTwentyIcons';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { t } from '@lingui/core/macro';
import {
  arrayOfUuidOrVariableSchema,
  isDefined,
  jsonRelationFilterValueSchema,
} from 'twenty-shared/utils';

type UseComputeRecordRelationFilterDisplayValueParams = {
  recordFilter: RecordFilter;
};

// The stored displayValue is deprecated and empty for filters created without one, so compute the label at runtime.
export const useComputeRecordRelationFilterDisplayValue = ({
  recordFilter,
}: UseComputeRecordRelationFilterDisplayValueParams) => {
  const allowRequestsToTwentyIcons = useAtomStateValue(
    allowRequestsToTwentyIconsState,
  );

  const { objectMetadataItems } = useObjectMetadataItems();

  if (!isDefined(recordFilter.fieldMetadataId)) {
    throw new Error('recordFilter.fieldMetadataId is not defined');
  }

  // Nested relation filters resolve records from the leaf relation's target object, direct filters from the source.
  const { fieldMetadataItem, objectMetadataItem } =
    getFieldMetadataItemByIdOrThrow({
      fieldMetadataId:
        recordFilter.relationTargetFieldMetadataId ??
        recordFilter.fieldMetadataId,
      objectMetadataItems,
    });

  // A junction relation points at the join object, whose records carry no
  // user-facing name. Resolve through it to the far side so the chip lists the
  // actual related records instead of opaque junction rows.
  const junctionConfig = hasJunctionTargetFieldId(fieldMetadataItem.settings)
    ? getJunctionConfig({
        settings: fieldMetadataItem.settings,
        relationObjectMetadataId:
          fieldMetadataItem.relation?.targetObjectMetadata.id ?? '',
        sourceObjectMetadataId: objectMetadataItem.id,
        objectMetadataItems,
      })
    : null;

  const junctionTargetField = junctionConfig?.targetFields[0];

  const junctionTargetObjectNameSingular =
    junctionTargetField?.relation?.targetObjectMetadata.nameSingular ??
    junctionTargetField?.morphRelations?.[0]?.targetObjectMetadata.nameSingular;

  const relationObjectMetadataNameSingular =
    junctionTargetObjectNameSingular ??
    getRelationObjectMetadataNameSingular({
      field: fieldMetadataItem,
    });

  if (!isDefined(relationObjectMetadataNameSingular)) {
    throw new Error('relationObjectMetadataNameSingular is not defined');
  }

  const relationObjectMetadataItem = objectMetadataItems.find(
    (objectMetadataItem) =>
      objectMetadataItem.nameSingular === relationObjectMetadataNameSingular,
  );

  if (!isDefined(relationObjectMetadataItem)) {
    throw new Error('relationObjectMetadataItem is not defined');
  }

  const relationObjectLabelPlural = relationObjectMetadataItem.labelPlural;

  const { isCurrentWorkspaceMemberSelected, selectedRecordIds } =
    jsonRelationFilterValueSchema
      .catch({
        isCurrentWorkspaceMemberSelected: false,
        selectedRecordIds: arrayOfUuidOrVariableSchema.parse(
          recordFilter.value,
        ),
      })
      .parse(recordFilter.value);

  const { selectedRecords, loading } = useRecordsForSelect({
    searchFilterText: '',
    selectedIds: selectedRecordIds,
    objectNameSingular: relationObjectMetadataNameSingular,
    limit: 10,
    allowRequestsToTwentyIcons,
  });

  if (loading) {
    return { displayValue: t`Loading...`, loading };
  }

  const labelValueItems = [
    ...(isCurrentWorkspaceMemberSelected ? [t`Me`] : []),
    ...selectedRecords.map((record) => record.name),
  ];

  const displayValue =
    labelValueItems.length > MAX_RECORDS_TO_DISPLAY
      ? `${labelValueItems.length} ${relationObjectLabelPlural.toLowerCase()}`
      : labelValueItems.join(', ');

  return { displayValue, loading };
};
