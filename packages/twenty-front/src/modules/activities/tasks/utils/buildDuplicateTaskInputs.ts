import { type Task } from '@/activities/types/Task';
import { type TaskTarget } from '@/activities/types/TaskTarget';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { isDefined } from 'twenty-shared/utils';

const TASK_TARGET_ID_FIELDS_TO_OMIT = new Set([
  'id',
  'taskId',
  'createdAt',
  'updatedAt',
  'deletedAt',
]);

export const buildDuplicateTaskRecordInput = (
  sourceTask: Task,
): Partial<ObjectRecord> => ({
  title: sourceTask.title,
  bodyV2: sourceTask.bodyV2,
  dueAt: sourceTask.dueAt,
  status: sourceTask.status,
  assigneeId: sourceTask.assigneeId,
  position: 'last',
});

export const buildDuplicateTaskTargetInputs = ({
  sourceTaskTargets,
  newTaskId,
}: {
  sourceTaskTargets: TaskTarget[];
  newTaskId: string;
}): Partial<ObjectRecord>[] =>
  sourceTaskTargets.map((sourceTaskTarget) => {
    const taskTargetInput: Partial<ObjectRecord> = {
      taskId: newTaskId,
    };

    for (const [fieldName, fieldValue] of Object.entries(sourceTaskTarget)) {
      if (
        fieldName.endsWith('Id') &&
        !TASK_TARGET_ID_FIELDS_TO_OMIT.has(fieldName) &&
        isDefined(fieldValue)
      ) {
        taskTargetInput[fieldName] = fieldValue;
      }
    }

    return taskTargetInput;
  });
