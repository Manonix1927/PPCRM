import { Module } from '@nestjs/common';

import { RecordCrudModule } from 'src/engine/core-modules/record-crud/record-crud.module';
import { TaskCreateOnePostQueryHook } from 'src/modules/task/query-hooks/task-create-one.post-query.hook';
import { TaskDeleteManyPostQueryHook } from 'src/modules/task/query-hooks/task-delete-many.post-query.hook';
import { TaskDeleteOnePostQueryHook } from 'src/modules/task/query-hooks/task-delete-one.post-query.hook';
import { TaskPostQueryHookService } from 'src/modules/task/query-hooks/task-post-query-hook.service';
import { TaskRestoreManyPostQueryHook } from 'src/modules/task/query-hooks/task-restore-many.post-query.hook';
import { TaskRestoreOnePostQueryHook } from 'src/modules/task/query-hooks/task-restore-one.post-query.hook';

@Module({
  imports: [RecordCrudModule],
  providers: [
    TaskPostQueryHookService,
    TaskCreateOnePostQueryHook,
    TaskDeleteManyPostQueryHook,
    TaskDeleteOnePostQueryHook,
    TaskRestoreManyPostQueryHook,
    TaskRestoreOnePostQueryHook,
  ],
})
export class TaskQueryHookModule {}
