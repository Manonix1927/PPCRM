import { type Task } from '@/activities/types/Task';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { buildDuplicateRecordInputFromSourceRecord } from '@/object-record/utils/buildDuplicateRecordInputFromSourceRecord';

// Task targets are a junction relation, so they are copied with the other
// junction rows rather than through the record input.
export const TASK_RELATION_FIELDS_TO_EXCLUDE = [
  'taskTargets',
  'attachments',
  'timelineActivities',
];

export const TASK_JUNCTION_FIELDS_TO_EXCLUDE = [
  'attachments',
  'timelineActivities',
];

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
    fieldsToExclude: TASK_RELATION_FIELDS_TO_EXCLUDE,
    additionalRecordInput: { position: 'last' },
  });
