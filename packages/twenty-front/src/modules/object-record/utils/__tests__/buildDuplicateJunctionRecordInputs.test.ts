import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import {
  buildDuplicateJunctionRecordInput,
  buildDuplicateJunctionRecordsBatches,
} from '@/object-record/utils/buildDuplicateJunctionRecordInputs';
import { FieldMetadataType, RelationType } from 'twenty-shared/types';

jest.mock('twenty-shared/utils', () => ({
  ...jest.requireActual('twenty-shared/utils'),
  computeRelationGqlFieldJoinColumnName: ({ name }: { name: string }) =>
    `${name}Id`,
}));

const taskObjectMetadataItem = {
  id: 'task-metadata-id',
  nameSingular: 'task',
  namePlural: 'tasks',
  fields: [],
} as unknown as EnrichedObjectMetadataItem;

const workspaceMemberObjectMetadataItem = {
  id: 'workspace-member-metadata-id',
  nameSingular: 'workspaceMember',
  namePlural: 'workspaceMembers',
  fields: [],
} as unknown as EnrichedObjectMetadataItem;

const taskAssignmentObjectMetadataItem = {
  id: 'task-assignment-metadata-id',
  nameSingular: 'taskAssignment',
  namePlural: 'taskAssignments',
  labelIdentifierFieldMetadataId: 'task-assignment-id-field',
  imageIdentifierFieldMetadataId: null,
  fields: [
    {
      id: 'task-assignment-task-field-id',
      name: 'task',
      type: FieldMetadataType.RELATION,
      relation: {
        type: RelationType.MANY_TO_ONE,
        sourceFieldMetadata: { id: 'task-assignment-task-field-id' },
        targetObjectMetadata: { id: 'task-metadata-id' },
        targetFieldMetadata: { id: 'assignees-field-id' },
      },
    },
    {
      id: 'task-assignment-assignee-field-id',
      name: 'assignee',
      type: FieldMetadataType.RELATION,
      relation: {
        type: RelationType.MANY_TO_ONE,
        sourceFieldMetadata: { id: 'task-assignment-assignee-field-id' },
        targetObjectMetadata: { id: 'workspace-member-metadata-id' },
        targetFieldMetadata: { id: 'workspace-member-assignments-field-id' },
      },
    },
  ],
} as unknown as EnrichedObjectMetadataItem;

const assigneesFieldMetadataItem = {
  id: 'assignees-field-id',
  name: 'assignees',
  type: FieldMetadataType.RELATION,
  isActive: true,
  settings: {
    relationType: RelationType.ONE_TO_MANY,
    junctionTargetFieldId: 'task-assignment-assignee-field-id',
  },
  relation: {
    type: RelationType.ONE_TO_MANY,
    sourceFieldMetadata: { id: 'assignees-field-id' },
    targetObjectMetadata: { id: 'task-assignment-metadata-id' },
    targetFieldMetadata: { id: 'task-assignment-task-field-id' },
  },
} as FieldMetadataItem;

const objectMetadataItems = [
  taskObjectMetadataItem,
  taskAssignmentObjectMetadataItem,
  workspaceMemberObjectMetadataItem,
];

describe('buildDuplicateJunctionRecordInputs', () => {
  it('should copy junction target ids for duplicate junction records', () => {
    const sourceJunctionRecord = {
      __typename: 'TaskAssignment',
      id: 'assignment-1',
      taskId: 'task-1',
      assigneeId: 'member-1',
      assignee: {
        id: 'member-1',
      },
    };

    expect(
      buildDuplicateJunctionRecordInput({
        sourceJunctionRecord,
        sourceJoinColumnName: 'taskId',
        newSourceRecordId: 'task-2',
        targetFields: [taskAssignmentObjectMetadataItem.fields[1]],
        objectMetadataItems,
      }),
    ).toEqual({
      taskId: 'task-2',
      assigneeId: 'member-1',
    });
  });

  it('should build duplicate junction record batches from source record', () => {
    const sourceTask = {
      __typename: 'Task',
      id: 'task-1',
      assignees: [
        {
          id: 'assignment-1',
          taskId: 'task-1',
          assignee: {
            id: 'member-1',
          },
        },
        {
          id: 'assignment-2',
          taskId: 'task-1',
          assigneeId: 'member-2',
        },
      ],
    };

    expect(
      buildDuplicateJunctionRecordsBatches({
        sourceRecord: sourceTask,
        objectMetadataItem: {
          ...taskObjectMetadataItem,
          fields: [assigneesFieldMetadataItem],
        },
        objectMetadataItems,
        newRecordId: 'task-2',
      }),
    ).toEqual([
      {
        junctionObjectNameSingular: 'taskAssignment',
        recordsToCreate: [
          {
            taskId: 'task-2',
            assigneeId: 'member-1',
          },
          {
            taskId: 'task-2',
            assigneeId: 'member-2',
          },
        ],
      },
    ]);
  });
});
