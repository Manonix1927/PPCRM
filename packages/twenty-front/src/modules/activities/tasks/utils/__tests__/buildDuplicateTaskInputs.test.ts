import { type Task } from '@/activities/types/Task';
import { type TaskTarget } from '@/activities/types/TaskTarget';
import {
  buildDuplicateTaskRecordInput,
  buildDuplicateTaskTargetInputs,
} from '@/activities/tasks/utils/buildDuplicateTaskInputs';

describe('buildDuplicateTaskInputs', () => {
  it('should copy task scalar fields for duplicate create input', () => {
    const sourceTask = {
      id: 'task-1',
      title: 'Follow up',
      bodyV2: { blocknote: null, markdown: 'Call client' },
      dueAt: '2026-05-26T10:00:00.000Z',
      status: 'TODO',
      assigneeId: 'member-1',
    } as Task;

    expect(buildDuplicateTaskRecordInput(sourceTask)).toEqual({
      title: 'Follow up',
      bodyV2: { blocknote: null, markdown: 'Call client' },
      dueAt: '2026-05-26T10:00:00.000Z',
      status: 'TODO',
      assigneeId: 'member-1',
      position: 'last',
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
