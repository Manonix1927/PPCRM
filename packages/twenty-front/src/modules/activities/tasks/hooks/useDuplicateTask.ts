import { createOneActivityOperationSignatureFactory } from '@/activities/graphql/operation-signatures/factories/createOneActivityOperationSignatureFactory';
import { type Task } from '@/activities/types/Task';
import { type TaskTarget } from '@/activities/types/TaskTarget';
import { getJoinObjectNameSingular } from '@/activities/utils/getJoinObjectNameSingular';
import {
  buildDuplicateTaskRecordInput,
  buildDuplicateTaskTargetInputs,
} from '@/activities/tasks/utils/buildDuplicateTaskInputs';
import { useCreateManyRecords } from '@/object-record/hooks/useCreateManyRecords';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { useLazyFindOneRecord } from '@/object-record/hooks/useLazyFindOneRecord';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isNonEmptyArray } from '@sniptt/guards';

export const useDuplicateTask = () => {
  const createOneActivityOperationSignature =
    createOneActivityOperationSignatureFactory({
      objectNameSingular: CoreObjectNameSingular.Task,
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

  const { findOneRecord } = useLazyFindOneRecord<Task>({
    objectNameSingular: CoreObjectNameSingular.Task,
    recordGqlFields: {
      ...createOneActivityOperationSignature.fields,
      taskTargets: {
        id: true,
        targetPersonId: true,
        targetCompanyId: true,
        targetOpportunityId: true,
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
      buildDuplicateTaskRecordInput(sourceTask),
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

    return createdTask;
  };

  return { duplicateTask };
};
