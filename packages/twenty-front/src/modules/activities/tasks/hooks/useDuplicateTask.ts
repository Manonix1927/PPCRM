import { createOneActivityOperationSignatureFactory } from '@/activities/graphql/operation-signatures/factories/createOneActivityOperationSignatureFactory';
import { type Task } from '@/activities/types/Task';
import {
  buildDuplicateTaskRecordInput,
  TASK_JUNCTION_FIELDS_TO_EXCLUDE,
} from '@/activities/tasks/utils/buildDuplicateTaskInputs';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { useGenerateDepthRecordGqlFieldsFromObject } from '@/object-record/graphql/record-gql-fields/hooks/useGenerateDepthRecordGqlFieldsFromObject';
import { useCreateManyRecordsByObjectNameSingular } from '@/object-record/hooks/useCreateManyRecordsByObjectNameSingular';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { useLazyFindOneRecord } from '@/object-record/hooks/useLazyFindOneRecord';
import { buildDuplicateJunctionRecordsBatches } from '@/object-record/utils/buildDuplicateJunctionRecordInputs';
import { CoreObjectNameSingular } from 'twenty-shared/types';

export const useDuplicateTask = () => {
  const { objectMetadataItems } = useObjectMetadataItems();

  const { objectMetadataItem: taskObjectMetadataItem } = useObjectMetadataItem({
    objectNameSingular: CoreObjectNameSingular.Task,
  });

  const createOneActivityOperationSignature =
    createOneActivityOperationSignatureFactory({
      objectNameSingular: CoreObjectNameSingular.Task,
    });

  const { recordGqlFields: depthOneRecordGqlFields } =
    useGenerateDepthRecordGqlFieldsFromObject({
      objectNameSingular: CoreObjectNameSingular.Task,
      depth: 1,
    });

  const { createOneRecord: createOneTask } = useCreateOneRecord<Task>({
    objectNameSingular: CoreObjectNameSingular.Task,
    recordGqlFields: createOneActivityOperationSignature.fields,
    shouldMatchRootQueryFilter: true,
  });

  const { createManyRecordsByObjectNameSingular } =
    useCreateManyRecordsByObjectNameSingular();

  const { findOneRecord } = useLazyFindOneRecord<Task>({
    objectNameSingular: CoreObjectNameSingular.Task,
    recordGqlFields: depthOneRecordGqlFields,
  });

  const duplicateTask = async (taskId: string): Promise<Task | null> => {
    let sourceTask: Task | undefined;

    await findOneRecord({
      objectRecordId: taskId,
      onCompleted: (record) => {
        sourceTask = record;
      },
    });

    if (!sourceTask) {
      return null;
    }

    const createdTask = await createOneTask(
      buildDuplicateTaskRecordInput({
        sourceTask,
        objectMetadataItem: taskObjectMetadataItem,
      }) as Partial<Task>,
    );

    const duplicateJunctionRecordsBatches = buildDuplicateJunctionRecordsBatches({
      sourceRecord: sourceTask,
      objectMetadataItem: taskObjectMetadataItem,
      objectMetadataItems,
      newRecordId: createdTask.id,
      fieldsToExclude: TASK_JUNCTION_FIELDS_TO_EXCLUDE,
    });

    for (const duplicateJunctionRecordsBatch of duplicateJunctionRecordsBatches) {
      await createManyRecordsByObjectNameSingular({
        objectNameSingular:
          duplicateJunctionRecordsBatch.junctionObjectNameSingular,
        recordsToCreate: duplicateJunctionRecordsBatch.recordsToCreate,
      });
    }

    return createdTask as Task;
  };

  return { duplicateTask };
};
