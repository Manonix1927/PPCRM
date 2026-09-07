import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WorkspaceIteratorModule } from 'src/database/commands/command-runners/workspace-iterator.module';
import { AddCalendarEventSummaryTabCommand } from 'src/database/commands/upgrade-version-command/2-32/2-32-workspace-command-1786609782000-add-calendar-event-summary-tab.command';
import { AddWorkspaceMemberUiScaleFieldCommand } from 'src/database/commands/upgrade-version-command/2-32/2-32-workspace-command-1786700000000-add-workspace-member-ui-scale-field.command';
import { RepairIncompleteWorkspaceMembersCommand } from 'src/database/commands/upgrade-version-command/2-32/2-32-workspace-command-1786900000000-repair-incomplete-workspace-members.command';
import { ApplicationModule } from 'src/engine/core-modules/application/application.module';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { UserWorkspaceModule } from 'src/engine/core-modules/user-workspace/user-workspace.module';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { RoleTargetEntity } from 'src/engine/metadata-modules/role-target/role-target.entity';
import { UserRoleModule } from 'src/engine/metadata-modules/user-role/user-role.module';
import { WorkspaceCacheModule } from 'src/engine/workspace-cache/workspace-cache.module';
import { WorkspaceMigrationModule } from 'src/engine/workspace-manager/workspace-migration/workspace-migration.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserWorkspaceEntity,
      WorkspaceEntity,
      RoleTargetEntity,
    ]),
    ApplicationModule,
    UserRoleModule,
    UserWorkspaceModule,
    WorkspaceCacheModule,
    WorkspaceIteratorModule,
    WorkspaceMigrationModule,
  ],
  providers: [
    AddCalendarEventSummaryTabCommand,
    AddWorkspaceMemberUiScaleFieldCommand,
    RepairIncompleteWorkspaceMembersCommand,
  ],
})
export class V2_32_UpgradeVersionCommandModule {}
