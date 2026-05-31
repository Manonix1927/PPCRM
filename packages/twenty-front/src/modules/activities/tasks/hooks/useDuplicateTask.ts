import { generateActivityTargetMorphFieldKeys } from '@/activities/utils/generateActivityTargetMorphFieldKeys';
import { createOneActivityOperationSignatureFactory } from '@/activities/graphql/operation-signatures/factories/createOneActivityOperationSignatureFactory';
import { type Task } from '@/activities/types/Task';
import { type TaskTarget } from '@/activities/types/TaskTarget';
import { getJoinObjectNameSingular } from '@/activities/utils/getJoinObjectNameSingular';
import {
  buildDuplicateTaskRecordInput,
  buildDuplicateTaskTargetInputs,
  TASK_RELATION_FIELDS_TO_EXCLUDE,
} from '@/activities/tasks/utils/buildDuplicateTaskInputs';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { useGenerateDepthRecordGqlFieldsFromObject } from '@/object-record/graphql/record-gql-fields/hooks/useGenerateDepthRecordGqlFieldsFromObject';
import { useCreateManyRecords } from '@/object-record/hooks/useCreateManyRecords';
import { useCreateManyRecordsByObjectNameSingular } from '@/object-record/hooks/useCreateManyRecordsByObjectNameSingular';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { useLazyFindOneRecord } from '@/object-record/hooks/useLazyFindOneRecord';
import { buildDuplicateJunctionRecordsBatches } from '@/object-record/utils/buildDuplicateJunctionRecordInputs';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isNonEmptyArray } from '@sniptt/guards';

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

  const { createManyRecords: createManyTaskTargets } = useCreateManyRecords<
    TaskTarget
  >({
    objectNameSingular: getJoinObjectNameSingular(
      CoreObjectNameSingular.Task,
    ),
    shouldMatchRootQueryFilter: true,
  });

  const { createManyRecordsByObjectNameSingular } =
    useCreateManyRecordsByObjectNameSingular();

  const { findOneRecord } = useLazyFindOneRecord<Task>({
    objectNameSingular: CoreObjectNameSingular.Task,
    recordGqlFields: {
      ...depthOneRecordGqlFields,
      taskTargets: {
        id: true,
        ...generateActivityTargetMorphFieldKeys(objectMetadataItems),
      },
    },
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
      }),
    );

    const taskTargetsToCreate = buildDuplicateTaskTargetInputs({
      sourceTaskTargets: sourceTask.taskTargets ?? [],
      newTaskId: createdTask.id,
    });

    if (isNonEmptyArray(taskTargetsToCreate)) {
      await createManyTaskTargets({
        recordsToCreate: taskTargetsToCreate,
      });
    }

    const duplicateJunctionRecordsBatches = buildDuplicateJunctionRecordsBatches({
      sourceRecord: sourceTask,
      objectMetadataItem: taskObjectMetadataItem,
      objectMetadataItems,
      newRecordId: createdTask.id,
      fieldsToExclude: TASK_RELATION_FIELDS_TO_EXCLUDE,
    });

    for (const duplicateJunctionRecordsBatch of duplicateJunctionRecordsBatches) {
      await createManyRecordsByObjectNameSingular({
        objectNameSingular:
          duplicateJunctionRecordsBatch.junctionObjectNameSingular,
        recordsToCreate: duplicateJunctionRecordsBatch.recordsToCreate,
      });
    }

    return createdTask;
  };

  return { duplicateTask };
};
