import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WorkspaceIteratorModule } from 'src/database/commands/command-runners/workspace-iterator.module';
import { AddDuplicateTaskCommandMenuItemCommand } from 'src/database/commands/upgrade-version-command/2-9/2-9-workspace-command-1799000040000-add-duplicate-task-command-menu-item.command';
import { MigrateAiModelPreferencesCommand } from 'src/database/commands/upgrade-version-command/2-9/2-9-workspace-command-1799000000000-migrate-ai-model-preferences.command';
import { RepairRolePermissionFlagSchemaFastInstanceCommand } from 'src/database/commands/upgrade-version-command/2-9/2-9-instance-command-fast-1799000050000-repair-role-permission-flag-schema';
import { RepairRolePermissionFlagUpgradeCursorFastInstanceCommand } from 'src/database/commands/upgrade-version-command/2-9/2-9-instance-command-fast-1799000060000-repair-role-permission-flag-upgrade-cursor';
import { ApplicationModule } from 'src/engine/core-modules/application/application.module';
import { KeyValuePairEntity } from 'src/engine/core-modules/key-value-pair/key-value-pair.entity';
import { WorkspaceCacheModule } from 'src/engine/workspace-cache/workspace-cache.module';
import { WorkspaceMigrationModule } from 'src/engine/workspace-manager/workspace-migration/workspace-migration.module';

@Module({
  imports: [
    ApplicationModule,
    TypeOrmModule.forFeature([KeyValuePairEntity]),
    WorkspaceCacheModule,
    WorkspaceIteratorModule,
    WorkspaceMigrationModule,
  ],
  providers: [
    AddDuplicateTaskCommandMenuItemCommand,
    MigrateAiModelPreferencesCommand,
    RepairRolePermissionFlagSchemaFastInstanceCommand,
    RepairRolePermissionFlagUpgradeCursorFastInstanceCommand,
  ],
})
export class V2_9_UpgradeVersionCommandModule {}
