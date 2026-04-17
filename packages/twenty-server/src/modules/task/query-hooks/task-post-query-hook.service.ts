import { Injectable } from '@nestjs/common';

import { assertIsDefinedOrThrow } from 'twenty-shared/utils';
import { In } from 'typeorm';

import { CommonApiContextBuilderService } from 'src/engine/core-modules/record-crud/services/common-api-context-builder.service';
import { CreateRecordService } from 'src/engine/core-modules/record-crud/services/create-record.service';
import { isUserAuthContext } from 'src/engine/core-modules/auth/guards/is-user-auth-context.guard';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { WorkspaceNotFoundDefaultError } from 'src/engine/core-modules/workspace/workspace.exception';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { TaskTargetWorkspaceEntity } from 'src/modules/task/standard-objects/task-target.workspace-entity';
import { TaskWorkspaceEntity } from 'src/modules/task/standard-objects/task.workspace-entity';

@Injectable()
export class TaskPostQueryHookService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly commonApiContextBuilder: CommonApiContextBuilderService,
    private readonly createRecordService: CreateRecordService,
  ) {}

  async handleTaskTargetsDelete(
    authContext: WorkspaceAuthContext,
    payload: TaskWorkspaceEntity[],
  ): Promise<void> {
    if (!payload || payload?.length === 0) {
      return;
    }

    const workspace = authContext.workspace;

    assertIsDefinedOrThrow(workspace, WorkspaceNotFoundDefaultError);

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const taskTargetRepository =
        await this.globalWorkspaceOrmManager.getRepository<TaskTargetWorkspaceEntity>(
          workspace.id,
          'taskTarget',
        );

      await taskTargetRepository.softDelete({
        taskId: In(payload.map((task) => task.id)),
      });
    }, authContext);
  }

  async handleTaskTargetsRestore(
    authContext: WorkspaceAuthContext,
    payload: TaskWorkspaceEntity[],
  ): Promise<void> {
    if (!payload || payload?.length === 0) {
      return;
    }

    const workspace = authContext.workspace;

    assertIsDefinedOrThrow(workspace, WorkspaceNotFoundDefaultError);

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const taskTargetRepository =
        await this.globalWorkspaceOrmManager.getRepository<TaskTargetWorkspaceEntity>(
          workspace.id,
          'taskTarget',
        );

      await taskTargetRepository.restore({
        taskId: In(payload.map((task) => task.id)),
      });
    }, authContext);
  }

  async handleDefaultTaskAssigneeCreate(
    authContext: WorkspaceAuthContext,
    payload: TaskWorkspaceEntity,
  ): Promise<void> {
    if (!isUserAuthContext(authContext)) {
      return;
    }

    const workspace = authContext.workspace;

    assertIsDefinedOrThrow(workspace, WorkspaceNotFoundDefaultError);

    const taskId = payload?.id;
    if (!taskId) {
      return;
    }

    // Find the junction object from Task's relation field "Ispolniteli"
    const taskContext = await this.commonApiContextBuilder.build({
      authContext,
      objectName: 'task',
    });

    const taskObjectMetadata = taskContext.flatObjectMetadata;
    const taskFields = Object.values(
      taskContext.flatFieldMetadataMaps.byUniversalIdentifier,
    );

    const taskAssigneesField = taskFields.find(
      (field) =>
        field.objectMetadataId === taskObjectMetadata.id &&
        field.type === 'RELATION' &&
        field.name === 'Ispolniteli' &&
        Boolean(field.relationTargetObjectMetadataId),
    );

    if (!taskAssigneesField?.relationTargetObjectMetadataId) {
      return;
    }

    const junctionObjectMetadata = findFlatEntityByIdInFlatEntityMaps({
      flatEntityId: taskAssigneesField.relationTargetObjectMetadataId,
      flatEntityMaps: taskContext.flatObjectMetadataMaps,
    });

    if (!junctionObjectMetadata) {
      return;
    }

    const workspaceMemberObjectId =
      taskContext.queryRunnerContext.objectIdByNameSingular['workspaceMember'];

    if (!workspaceMemberObjectId) {
      return;
    }

    // Load junction object field metadata to locate the 2 "belongs to one" relations:
    // - junction -> task
    // - junction -> workspaceMember
    const junctionContext = await this.commonApiContextBuilder.build({
      authContext,
      objectName: junctionObjectMetadata.nameSingular,
    });

    const junctionFields = Object.values(
      junctionContext.flatFieldMetadataMaps.byUniversalIdentifier,
    ).filter((field) => field.objectMetadataId === junctionObjectMetadata.id);

    const junctionToTaskField = junctionFields.find(
      (field) =>
        field.type === 'RELATION' &&
        field.relationTargetObjectMetadataId === taskObjectMetadata.id,
    );
    const junctionToWorkspaceMemberField = junctionFields.find(
      (field) =>
        field.type === 'RELATION' &&
        field.relationTargetObjectMetadataId === workspaceMemberObjectId,
    );

    const junctionToTaskJoinColumnName = (junctionToTaskField?.settings as any)
      ?.joinColumnName as string | undefined;
    const junctionToWorkspaceMemberJoinColumnName = (
      junctionToWorkspaceMemberField?.settings as any
    )?.joinColumnName as string | undefined;

    if (!junctionToTaskJoinColumnName || !junctionToWorkspaceMemberJoinColumnName) {
      return;
    }

    await this.createRecordService.execute({
      authContext,
      objectName: junctionObjectMetadata.nameSingular,
      objectRecord: {
        [junctionToTaskJoinColumnName]: taskId,
        [junctionToWorkspaceMemberJoinColumnName]: authContext.workspaceMemberId,
      },
      slimResponse: true,
    });
  }
}
