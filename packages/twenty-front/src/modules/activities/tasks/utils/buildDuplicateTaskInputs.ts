import { type Task } from '@/activities/types/Task';
import { type TaskTarget } from '@/activities/types/TaskTarget';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { buildDuplicateRecordInputFromSourceRecord } from '@/object-record/utils/buildDuplicateRecordInputFromSourceRecord';
import { isDefined } from 'twenty-shared/utils';

const TASK_FIELDS_TO_EXCLUDE = [
  'taskTargets',
  'attachments',
  'timelineActivities',
];

const TASK_TARGET_ID_FIELDS_TO_OMIT = new Set([
  'id',
  'taskId',
  'createdAt',
  'updatedAt',
  'deletedAt',
]);

export const buildDuplicateTaskRecordInput = ({
  sourceTask,
  objectMetadataItem,
}: {
  sourceTask: Task;
  objectMetadataItem: EnrichedObjectMetadataItem;
}): Partial<ObjectRecord> =>
  buildDuplicateRecordInputFromSourceRecord({
    sourceRecord: sourceTask,
    objectMetadataItem,
    fieldsToExclude: TASK_FIELDS_TO_EXCLUDE,
    additionalRecordInput: { position: 'last' },
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
