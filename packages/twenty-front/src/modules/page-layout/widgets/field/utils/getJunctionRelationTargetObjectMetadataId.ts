import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { getJunctionConfig } from '@/object-record/record-field/ui/utils/junction/getJunctionConfig';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

type GetJunctionRelationTargetObjectMetadataIdArgs = {
  settings: FieldMetadataItem['settings'] | undefined;
  relationObjectMetadataId: string;
  sourceObjectMetadataId: string;
  objectMetadataItems: EnrichedObjectMetadataItem[];
};

export const getJunctionRelationTargetObjectMetadataId = ({
  settings,
  relationObjectMetadataId,
  sourceObjectMetadataId,
  objectMetadataItems,
}: GetJunctionRelationTargetObjectMetadataIdArgs): string | undefined => {
  const junctionConfig = getJunctionConfig({
    settings,
    relationObjectMetadataId,
    sourceObjectMetadataId,
    objectMetadataItems,
  });

  if (!isDefined(junctionConfig)) {
    return undefined;
  }

  const targetField = junctionConfig.targetFields[0];

  if (!isDefined(targetField)) {
    return undefined;
  }

  if (targetField.type === FieldMetadataType.MORPH_RELATION) {
    return targetField.morphRelations?.[0]?.targetObjectMetadata.id;
  }

  return targetField.relation?.targetObjectMetadata.id;
};
