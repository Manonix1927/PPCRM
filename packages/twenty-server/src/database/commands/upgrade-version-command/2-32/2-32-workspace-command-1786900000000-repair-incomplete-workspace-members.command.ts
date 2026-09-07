import { InjectRepository } from '@nestjs/typeorm';

import { Command } from 'nest-commander';
import { Repository } from 'typeorm';
import { isDefined } from 'twenty-shared/utils';

import { ProvisionedWorkspaceCommandRunner } from 'src/database/commands/command-runners/provisioned-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { UserWorkspaceService } from 'src/engine/core-modules/user-workspace/user-workspace.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { RoleTargetEntity } from 'src/engine/metadata-modules/role-target/role-target.entity';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';

// Joining a workspace writes the userWorkspace row before creating the
// workspace member and assigning its role, and the three steps are not in a
// transaction. A failure in between leaves a member who cannot sign in, and
// the join path returns early on the existing userWorkspace row, so nothing
// ever repairs it. This completes those half-created memberships.
@RegisteredWorkspaceCommand('2.32.0', 1786900000000)
@Command({
  name: 'upgrade:2-32:repair-incomplete-workspace-members',
  description:
    'Create the missing workspace member and role for userWorkspaces left half-created by a failed join',
})
export class RepairIncompleteWorkspaceMembersCommand extends ProvisionedWorkspaceCommandRunner {
  constructor(
    protected readonly workspaceIteratorService: WorkspaceIteratorService,
    @InjectRepository(UserWorkspaceEntity)
    private readonly userWorkspaceRepository: Repository<UserWorkspaceEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    @InjectRepository(RoleTargetEntity)
    private readonly roleTargetRepository: Repository<RoleTargetEntity>,
    private readonly userWorkspaceService: UserWorkspaceService,
    private readonly userRoleService: UserRoleService,
  ) {
    super(workspaceIteratorService);
  }

  override async runOnWorkspace({
    workspaceId,
    options,
  }: RunOnWorkspaceArgs): Promise<void> {
    const isDryRun = options.dryRun ?? false;

    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!isDefined(workspace)) {
      return;
    }

    const userWorkspaces = await this.userWorkspaceRepository.find({
      where: { workspaceId },
      relations: { user: true },
    });

    for (const userWorkspace of userWorkspaces) {
      const user = userWorkspace.user;

      if (!isDefined(user)) {
        continue;
      }

      if (isDryRun) {
        this.logger.log(
          `[DRY RUN] Would repair the membership of ${user.email} in workspace ${workspaceId} if incomplete`,
        );

        continue;
      }

      // Idempotent: returns early when the member already exists.
      await this.userWorkspaceService.createWorkspaceMember(workspaceId, user);

      await this.assignDefaultRoleIfMissing({ userWorkspace, workspace });
    }
  }

  private async assignDefaultRoleIfMissing({
    userWorkspace,
    workspace,
  }: {
    userWorkspace: UserWorkspaceEntity;
    workspace: WorkspaceEntity;
  }): Promise<void> {
    const hasRole = await this.roleTargetRepository.exists({
      where: {
        userWorkspaceId: userWorkspace.id,
        workspaceId: workspace.id,
      },
    });

    if (hasRole) {
      return;
    }

    const defaultRoleId = workspace.defaultRoleId;

    if (!isDefined(defaultRoleId)) {
      this.logger.warn(
        `Workspace ${workspace.id} has no default role, leaving userWorkspace ${userWorkspace.id} without one`,
      );

      return;
    }

    await this.userRoleService.assignRoleToManyUserWorkspace({
      workspaceId: workspace.id,
      userWorkspaceIds: [userWorkspace.id],
      roleId: defaultRoleId,
    });

    this.logger.log(
      `Assigned the default role to userWorkspace ${userWorkspace.id} in workspace ${workspace.id}`,
    );
  }
}
