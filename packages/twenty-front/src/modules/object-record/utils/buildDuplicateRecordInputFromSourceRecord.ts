import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { isFieldMorphRelation } from '@/object-record/record-field/ui/types/guards/isFieldMorphRelation';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { isSystemSearchVectorField } from '@/object-record/utils/isSystemSearchVectorField';
import { FieldMetadataType, RelationType } from 'twenty-shared/types';
import {
  computeMorphRelationGqlFieldJoinColumnName,
  computeRelationGqlFieldJoinColumnName,
  isDefined,
} from 'twenty-shared/utils';

const ACTOR_FIELD_NAMES = new Set(['createdBy', 'updatedBy']);

const stripTypenameFromValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stripTypenameFromValue);
  }

  if (isDefined(value) && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== '__typename')
        .map(([key, nestedValue]) => [key, stripTypenameFromValue(nestedValue)]),
    );
  }

  return value;
};

const sanitizeRichTextFieldValue = (value: unknown) => {
  if (!isDefined(value) || typeof value !== 'object') {
    return value;
  }

  const richTextValue = value as Record<string, unknown>;

  return {
    blocknote: richTextValue.blocknote ?? null,
    markdown: richTextValue.markdown ?? null,
  };
};

export const buildDuplicateRecordInputFromSourceRecord = ({
  sourceRecord,
  objectMetadataItem,
  fieldsToExclude = [],
  additionalRecordInput = {},
}: {
  sourceRecord: ObjectRecord;
  objectMetadataItem: EnrichedObjectMetadataItem;
  fieldsToExclude?: string[];
  additionalRecordInput?: Partial<ObjectRecord>;
}): Partial<ObjectRecord> => {
  const excludedFieldNames = new Set(fieldsToExclude);
  const recordInput: Partial<ObjectRecord> = { ...additionalRecordInput };

  for (const fieldMetadataItem of objectMetadataItem.fields) {
    if (!fieldMetadataItem.isActive) {
      continue;
    }

    if (excludedFieldNames.has(fieldMetadataItem.name)) {
      continue;
    }

    if (isSystemSearchVectorField(fieldMetadataItem.name)) {
      continue;
    }

    if (ACTOR_FIELD_NAMES.has(fieldMetadataItem.name)) {
      continue;
    }

    if (
      fieldMetadataItem.name === 'id' ||
      fieldMetadataItem.name === 'createdAt' ||
      fieldMetadataItem.name === 'updatedAt' ||
      fieldMetadataItem.name === 'deletedAt'
    ) {
      continue;
    }

    if (fieldMetadataItem.type === FieldMetadataType.RELATION) {
      if (fieldMetadataItem.relation?.type === RelationType.ONE_TO_MANY) {
        continue;
      }

      if (fieldMetadataItem.relation?.type === RelationType.MANY_TO_ONE) {
        const joinColumnName = computeRelationGqlFieldJoinColumnName({
          name: fieldMetadataItem.name,
        });
        const joinColumnValue = sourceRecord[joinColumnName];

        if (isDefined(joinColumnValue)) {
          recordInput[joinColumnName] = joinColumnValue;
        }
      }

      continue;
    }

    if (isFieldMorphRelation(fieldMetadataItem)) {
      for (const morphRelation of fieldMetadataItem.morphRelations ?? []) {
        const joinColumnName = computeMorphRelationGqlFieldJoinColumnName({
          fieldName: fieldMetadataItem.name,
          relationType: morphRelation.type,
          targetObjectMetadataNameSingular:
            morphRelation.targetObjectMetadata.nameSingular,
          targetObjectMetadataNamePlural:
            morphRelation.targetObjectMetadata.namePlural,
        });
        const joinColumnValue = sourceRecord[joinColumnName];

        if (isDefined(joinColumnValue)) {
          recordInput[joinColumnName] = joinColumnValue;
        }
      }

      continue;
    }

    if (fieldMetadataItem.type === FieldMetadataType.ACTOR) {
      continue;
    }

    const fieldValue = sourceRecord[fieldMetadataItem.name];

    if (!isDefined(fieldValue)) {
      continue;
    }

    if (fieldMetadataItem.type === FieldMetadataType.RICH_TEXT) {
      recordInput[fieldMetadataItem.name] =
        sanitizeRichTextFieldValue(fieldValue);
      continue;
    }

    if (
      fieldMetadataItem.type === FieldMetadataType.FILES &&
      Array.isArray(fieldValue)
    ) {
      recordInput[fieldMetadataItem.name] = fieldValue.map(
        (file: { fileId: string; label: string }) => ({
          fileId: file.fileId,
          label: file.label,
        }),
      );
      continue;
    }

    if (typeof fieldValue === 'object') {
      recordInput[fieldMetadataItem.name] = stripTypenameFromValue(
        fieldValue,
      ) as ObjectRecord[string];
      continue;
    }

    recordInput[fieldMetadataItem.name] = fieldValue;
  }

  return recordInput;
};
