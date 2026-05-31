import { type Task } from '@/activities/types/Task';
import { type TaskTarget } from '@/activities/types/TaskTarget';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import {
  buildDuplicateTaskRecordInput,
  buildDuplicateTaskTargetInputs,
} from '@/activities/tasks/utils/buildDuplicateTaskInputs';
import { FieldMetadataType } from 'twenty-shared/types';

const taskObjectMetadataItem = {
  fields: [
    { name: 'title', type: FieldMetadataType.TEXT, isActive: true },
    {
      name: 'bodyV2',
      type: FieldMetadataType.RICH_TEXT,
      isActive: true,
    },
    { name: 'dueAt', type: FieldMetadataType.DATE_TIME, isActive: true },
    { name: 'status', type: FieldMetadataType.SELECT, isActive: true },
    {
      name: 'customField',
      type: FieldMetadataType.TEXT,
      isActive: true,
    },
  ],
} as EnrichedObjectMetadataItem;

describe('buildDuplicateTaskInputs', () => {
  it('should copy all task fields including custom fields for duplicate create input', () => {
    const sourceTask = {
      id: 'task-1',
      title: 'Follow up',
      bodyV2: { blocknote: null, markdown: 'Call client' },
      dueAt: '2026-05-26T10:00:00.000Z',
      status: 'TODO',
      customField: 'Custom value',
    } as Task;

    expect(
      buildDuplicateTaskRecordInput({
        sourceTask,
        objectMetadataItem: taskObjectMetadataItem,
      }),
    ).toEqual({
      title: 'Follow up',
      bodyV2: { blocknote: null, markdown: 'Call client' },
      dueAt: '2026-05-26T10:00:00.000Z',
      status: 'TODO',
      customField: 'Custom value',
      position: 'last',
    });
  });

  it('should strip Apollo metadata from rich text when building create input', () => {
    const sourceTask = {
      id: 'task-1',
      title: 'Follow up',
      bodyV2: {
        __typename: 'RichTextV2',
        blocknote: '[]',
        markdown: 'Call client',
      },
      dueAt: null,
      status: 'TODO',
    } as Task;

    expect(
      buildDuplicateTaskRecordInput({
        sourceTask,
        objectMetadataItem: taskObjectMetadataItem,
      }).bodyV2,
    ).toEqual({
      blocknote: '[]',
      markdown: 'Call client',
    });
  });

  it('should copy task target relation ids for duplicate task targets', () => {
    const sourceTaskTargets = [
      {
        id: 'target-1',
        taskId: 'task-1',
        targetOpportunityId: 'opportunity-1',
      },
      {
        id: 'target-2',
        taskId: 'task-1',
        targetPersonId: 'person-1',
      },
    ] as TaskTarget[];

    expect(
      buildDuplicateTaskTargetInputs({
        sourceTaskTargets,
        newTaskId: 'task-2',
      }),
    ).toEqual([
      {
        taskId: 'task-2',
        targetOpportunityId: 'opportunity-1',
      },
      {
        taskId: 'task-2',
        targetPersonId: 'person-1',
      },
    ]);
  });
});
