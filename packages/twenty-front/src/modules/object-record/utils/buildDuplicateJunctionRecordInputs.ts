import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { getJunctionConfig } from '@/object-record/record-field/ui/utils/junction/getJunctionConfig';
import { getSourceJoinColumnName } from '@/object-record/record-field/ui/utils/junction/getSourceJoinColumnName';
import { isJunctionRelationField } from '@/object-record/record-field/ui/utils/junction/isJunctionRelationField';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { FieldMetadataType } from 'twenty-shared/types';
import {
  computeMorphRelationGqlFieldName,
  computeRelationGqlFieldJoinColumnName,
  isDefined,
} from 'twenty-shared/utils';

export type DuplicateJunctionRecordsBatch = {
  junctionObjectNameSingular: string;
  recordsToCreate: Partial<ObjectRecord>[];
};

const getTargetIdFromJunctionRecord = ({
  junctionRecord,
  targetFieldName,
  targetJoinColumnName,
}: {
  junctionRecord: ObjectRecord;
  targetFieldName: string;
  targetJoinColumnName: string;
}): string | undefined => {
  const joinColumnValue = junctionRecord[targetJoinColumnName];

  if (isDefined(joinColumnValue) && typeof joinColumnValue === 'string') {
    return joinColumnValue;
  }

  const nestedTarget = junctionRecord[targetFieldName];

  if (
    isDefined(nestedTarget) &&
    typeof nestedTarget === 'object' &&
    'id' in nestedTarget &&
    typeof nestedTarget.id === 'string'
  ) {
    return nestedTarget.id;
  }

  return undefined;
};

const buildTargetJoinColumnsFromJunctionRecord = ({
  junctionRecord,
  targetFields,
  objectMetadataItems,
}: {
  junctionRecord: ObjectRecord;
  targetFields: FieldMetadataItem[];
  objectMetadataItems: EnrichedObjectMetadataItem[];
}): Partial<ObjectRecord> => {
  const targetJoinColumns: Partial<ObjectRecord> = {};

  for (const targetField of targetFields) {
    if (targetField.type === FieldMetadataType.MORPH_RELATION) {
      for (const morphRelation of targetField.morphRelations ?? []) {
        const targetObjectMetadata = objectMetadataItems.find(
          (objectMetadataItem) =>
            objectMetadataItem.id === morphRelation.targetObjectMetadata.id,
        );

        if (!isDefined(targetObjectMetadata)) {
          continue;
        }

        const targetFieldName = computeMorphRelationGqlFieldName({
          fieldName: morphRelation.sourceFieldMetadata.name,
          relationType: morphRelation.type,
          targetObjectMetadataNameSingular: targetObjectMetadata.nameSingular,
          targetObjectMetadataNamePlural: targetObjectMetadata.namePlural,
        });
        const targetJoinColumnName = computeRelationGqlFieldJoinColumnName({
          name: targetFieldName,
        });
        const targetId = getTargetIdFromJunctionRecord({
          junctionRecord,
          targetFieldName,
          targetJoinColumnName,
        });

        if (isDefined(targetId)) {
          targetJoinColumns[targetJoinColumnName] = targetId;
        }
      }

      continue;
    }

    const targetJoinColumnName = computeRelationGqlFieldJoinColumnName({
      name: targetField.name,
    });
    const targetId = getTargetIdFromJunctionRecord({
      junctionRecord,
      targetFieldName: targetField.name,
      targetJoinColumnName,
    });

    if (isDefined(targetId)) {
      targetJoinColumns[targetJoinColumnName] = targetId;
    }
  }

  return targetJoinColumns;
};

export const buildDuplicateJunctionRecordInput = ({
  sourceJunctionRecord,
  sourceJoinColumnName,
  newSourceRecordId,
  targetFields,
  objectMetadataItems,
}: {
  sourceJunctionRecord: ObjectRecord;
  sourceJoinColumnName: string;
  newSourceRecordId: string;
  targetFields: FieldMetadataItem[];
  objectMetadataItems: EnrichedObjectMetadataItem[];
}): Partial<ObjectRecord> => ({
  [sourceJoinColumnName]: newSourceRecordId,
  ...buildTargetJoinColumnsFromJunctionRecord({
    junctionRecord: sourceJunctionRecord,
    targetFields,
    objectMetadataItems,
  }),
});

export const buildDuplicateJunctionRecordsBatches = ({
  sourceRecord,
  objectMetadataItem,
  objectMetadataItems,
  newRecordId,
  fieldsToExclude = [],
}: {
  sourceRecord: ObjectRecord;
  objectMetadataItem: EnrichedObjectMetadataItem;
  objectMetadataItems: EnrichedObjectMetadataItem[];
  newRecordId: string;
  fieldsToExclude?: string[];
}): DuplicateJunctionRecordsBatch[] => {
  const excludedFieldNames = new Set(fieldsToExclude);
  const duplicateJunctionRecordsBatches: DuplicateJunctionRecordsBatch[] = [];

  for (const fieldMetadataItem of objectMetadataItem.fields) {
    if (!fieldMetadataItem.isActive) {
      continue;
    }

    if (excludedFieldNames.has(fieldMetadataItem.name)) {
      continue;
    }

    if (!isJunctionRelationField(fieldMetadataItem)) {
      continue;
    }

    const junctionConfig = getJunctionConfig({
      settings: fieldMetadataItem.settings,
      relationObjectMetadataId:
        fieldMetadataItem.relation?.targetObjectMetadata.id ?? '',
      sourceObjectMetadataId: objectMetadataItem.id,
      objectMetadataItems,
    });

    if (
      !isDefined(junctionConfig) ||
      !isDefined(junctionConfig.sourceField) ||
      junctionConfig.targetFields.length === 0
    ) {
      continue;
    }

    const sourceJoinColumnName = getSourceJoinColumnName({
      sourceField: junctionConfig.sourceField,
      sourceObjectMetadata: objectMetadataItem,
    });

    if (!isDefined(sourceJoinColumnName)) {
      continue;
    }

    const sourceJunctionRecords = sourceRecord[fieldMetadataItem.name];

    if (!Array.isArray(sourceJunctionRecords) || sourceJunctionRecords.length === 0) {
      continue;
    }

    const recordsToCreate = sourceJunctionRecords
      .map((sourceJunctionRecord) =>
        buildDuplicateJunctionRecordInput({
          sourceJunctionRecord,
          sourceJoinColumnName,
          newSourceRecordId: newRecordId,
          targetFields: junctionConfig.targetFields,
          objectMetadataItems,
        }),
      )
      .filter((recordToCreate) => Object.keys(recordToCreate).length > 1);

    if (recordsToCreate.length === 0) {
      continue;
    }

    duplicateJunctionRecordsBatches.push({
      junctionObjectNameSingular:
        junctionConfig.junctionObjectMetadata.nameSingular,
      recordsToCreate,
    });
  }

  return duplicateJunctionRecordsBatches;
};
