import { Injectable, Logger } from '@nestjs/common';

import { assertIsDefinedOrThrow } from 'twenty-shared/utils';
import { In } from 'typeorm';

import { isUserAuthContext } from 'src/engine/core-modules/auth/guards/is-user-auth-context.guard';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { buildObjectIdByNameMaps } from 'src/engine/metadata-modules/flat-object-metadata/utils/build-object-id-by-name-maps.util';
import { WorkspaceNotFoundDefaultError } from 'src/engine/core-modules/workspace/workspace.exception';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { TaskTargetWorkspaceEntity } from 'src/modules/task/standard-objects/task-target.workspace-entity';
import { TaskWorkspaceEntity } from 'src/modules/task/standard-objects/task.workspace-entity';

@Injectable()
export class TaskPostQueryHookService {
  private readonly logger = new Logger(TaskPostQueryHookService.name);

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly workspaceManyOrAllFlatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
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

    const { flatObjectMetadataMaps, flatFieldMetadataMaps } =
      await this.workspaceManyOrAllFlatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId: workspace.id,
          flatMapsKeys: ['flatObjectMetadataMaps', 'flatFieldMetadataMaps'],
        },
      );

    const { idByNameSingular } = buildObjectIdByNameMaps(flatObjectMetadataMaps);

    const taskObjectId = idByNameSingular['task'];
    const workspaceMemberObjectId = idByNameSingular['workspaceMember'];

    if (!taskObjectId || !workspaceMemberObjectId) {
      return;
    }

    const taskObjectMetadata = findFlatEntityByIdInFlatEntityMaps({
      flatEntityId: taskObjectId,
      flatEntityMaps: flatObjectMetadataMaps,
    });

    if (!taskObjectMetadata) {
      return;
    }

    const taskFields = Object.values(flatFieldMetadataMaps.byUniversalIdentifier);

    const taskAssigneesField = taskFields.find(
      (field) =>
        field.objectMetadataId === taskObjectId &&
        field.type === 'RELATION' &&
        field.name === 'Ispolniteli' &&
        Boolean(field.relationTargetObjectMetadataId),
    );

    if (!taskAssigneesField?.relationTargetObjectMetadataId) {
      return;
    }

    const junctionObjectMetadata = findFlatEntityByIdInFlatEntityMaps({
      flatEntityId: taskAssigneesField.relationTargetObjectMetadataId,
      flatEntityMaps: flatObjectMetadataMaps,
    });

    if (!junctionObjectMetadata) {
      return;
    }

    // Locate the 2 "belongs to one" relations on the junction object:
    // - junction -> task
    // - junction -> workspaceMember
    const junctionFields = Object.values(
      flatFieldMetadataMaps.byUniversalIdentifier,
    ).filter((field) => field.objectMetadataId === junctionObjectMetadata.id);

    const junctionToTaskField = junctionFields.find(
      (field) =>
        field.type === 'RELATION' &&
        field.relationTargetObjectMetadataId === taskObjectId,
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

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const junctionRepository =
        await this.globalWorkspaceOrmManager.getRepository<Record<string, any>>(
          workspace.id,
          junctionObjectMetadata.nameSingular,
          { shouldBypassPermissionChecks: true },
        );

      try {
        await junctionRepository.insert({
          [junctionToTaskJoinColumnName]: taskId,
          [junctionToWorkspaceMemberJoinColumnName]: authContext.workspaceMemberId,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        // Best-effort: if unique constraints already created the link, ignore.
        // Postgres unique violation: 23505
        if (message.includes('23505') || message.toLowerCase().includes('duplicate')) {
          return;
        }

        this.logger.error(
          `Failed to create default task assignee link for task ${taskId}: ${message}`,
        );
      }
    }, authContext);
  }
}
