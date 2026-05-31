import gql from 'graphql-tag';

import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { mapObjectMetadataToGraphQLQuery } from '@/object-metadata/utils/mapObjectMetadataToGraphQLQuery';
import { generateDepthRecordGqlFieldsFromObject } from '@/object-record/graphql/record-gql-fields/utils/generateDepthRecordGqlFieldsFromObject';
import { useObjectPermissions } from '@/object-record/hooks/useObjectPermissions';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { getCreateManyRecordsMutationResponseField } from '@/object-record/utils/getCreateManyRecordsMutationResponseField';
import { sanitizeRecordInput } from '@/object-record/utils/sanitizeRecordInput';
import { capitalize, isDefined } from 'twenty-shared/utils';

export const useCreateManyRecordsByObjectNameSingular = () => {
  const apolloCoreClient = useApolloCoreClient();
  const { objectMetadataItems } = useObjectMetadataItems();
  const { objectPermissionsByObjectMetadataId } = useObjectPermissions();

  const createManyRecordsByObjectNameSingular = async ({
    objectNameSingular,
    recordsToCreate,
  }: {
    objectNameSingular: string;
    recordsToCreate: Partial<ObjectRecord>[];
  }) => {
    const objectMetadataItem = objectMetadataItems.find(
      (metadataItem) => metadataItem.nameSingular === objectNameSingular,
    );

    if (!isDefined(objectMetadataItem)) {
      throw new Error(
        `Object metadata not found for ${objectNameSingular}`,
      );
    }

    const recordGqlFields = generateDepthRecordGqlFieldsFromObject({
      objectMetadataItems,
      objectMetadataItem,
      depth: 1,
    });

    const mutationResponseField = getCreateManyRecordsMutationResponseField(
      objectMetadataItem.namePlural,
    );

    const createManyRecordsMutation = gql`
      mutation Create${capitalize(objectMetadataItem.namePlural)}($data: [${capitalize(
        objectMetadataItem.nameSingular,
      )}CreateInput!]!, $upsert: Boolean) {
        ${mutationResponseField}(data: $data, upsert: $upsert) ${mapObjectMetadataToGraphQLQuery(
          {
            objectMetadataItems,
            objectMetadataItem,
            recordGqlFields,
            objectPermissionsByObjectMetadataId,
          },
        )}
      }
    `;

    const sanitizedRecordsToCreate = recordsToCreate.map((recordToCreate) =>
      sanitizeRecordInput({
        objectMetadataItem,
        recordInput: recordToCreate,
      }),
    );

    const createdObjects = await apolloCoreClient.mutate({
      mutation: createManyRecordsMutation,
      variables: {
        data: sanitizedRecordsToCreate,
        upsert: false,
      },
    });

    return (
      (createdObjects.data as Record<string, ObjectRecord[]> | null)?.[
        mutationResponseField
      ] ?? []
    );
  };

  return { createManyRecordsByObjectNameSingular };
};
