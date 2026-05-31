import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

// Handles the case where the 2.6 rename command was previously marked as
// "completed" in upgradeMigration before the physical rename actually ran
// (e.g. the repair commands ran on a pre-2.6 DB and exited early but were
// still stamped "completed" by the runner). In that stuck state all three
// earlier repair commands show "already executed, skipping" on every deploy
// while the app keeps querying core."permissionFlag" for roleId.
@RegisteredInstanceCommand('2.9.0', 1799000070000)
export class ForceRenamePermissionFlagIfStuckFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const [state] = await queryRunner.query(`
      SELECT
        EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'core'
            AND table_name = 'permissionFlag'
            AND column_name = 'roleId'
        ) AS "permissionFlagHasRoleId",
        EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'core'
            AND table_name = 'rolePermissionFlag'
        ) AS "rolePermissionFlagExists",
        EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'core'
            AND table_name = 'permissionFlag'
            AND column_name = 'key'
        ) AS "permissionFlagIsCatalog"
    `);

    // Already healthy — nothing to do.
    if (state.permissionFlagIsCatalog && state.rolePermissionFlagExists) {
      return;
    }

    // permissionFlag is still the old pre-2.6 table (has roleId, no key).
    // rolePermissionFlag does not exist yet. Perform the rename directly so
    // the 2.6 syncable-entity command can create the new catalog table.
    if (state.permissionFlagHasRoleId && !state.rolePermissionFlagExists) {
      await queryRunner.query(
        `ALTER TABLE "core"."permissionFlag" RENAME TO "rolePermissionFlag"`,
      );

      // Drop old PK, add canonical one expected by the entity.
      await queryRunner.query(
        `ALTER TABLE "core"."rolePermissionFlag" DROP CONSTRAINT IF EXISTS "PK_a02789db60620a1e9f90147b50f"`,
      );
      await queryRunner.query(
        `ALTER TABLE "core"."rolePermissionFlag" DROP CONSTRAINT IF EXISTS "PK_8c144a021030d7e3326835a04c8"`,
      );
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'PK_76591adc8035c2e7b0cd6115136'
          ) THEN
            ALTER TABLE "core"."rolePermissionFlag"
            ADD CONSTRAINT "PK_76591adc8035c2e7b0cd6115136" PRIMARY KEY ("id");
          END IF;
        END $$;
      `);

      // Re-create the workspace/universalIdentifier unique index used by the
      // SyncableEntity framework.
      await queryRunner.query(`
        DROP INDEX IF EXISTS "core"."IDX_da8ffd3c24b4a819430a861067"
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "IDX_e4559ae0dba56e53714137c704"
        ON "core"."rolePermissionFlag" ("workspaceId", "universalIdentifier")
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_ROLE_PERMISSION_FLAG_ROLE_ID"
        ON "core"."rolePermissionFlag" ("roleId")
      `);

      // Now create the new permissionFlag catalog table so the app can start.
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "core"."permissionFlag" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "workspaceId" uuid NOT NULL,
          "applicationId" uuid NOT NULL,
          "universalIdentifier" uuid NOT NULL,
          "key" varchar NOT NULL,
          "label" varchar NOT NULL,
          "description" text,
          "icon" varchar,
          "permissionType" varchar NOT NULL,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "IDX_PERMISSION_FLAG_KEY_WORKSPACE_ID_UNIQUE" UNIQUE ("key", "workspaceId"),
          CONSTRAINT "PK_a02789db60620a1e9f90147b50f" PRIMARY KEY ("id")
        )
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_PERMISSION_FLAG_APPLICATION_ID"
        ON "core"."permissionFlag" ("applicationId")
      `);

      await queryRunner.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "IDX_da8ffd3c24b4a819430a861067"
        ON "core"."permissionFlag" ("workspaceId", "universalIdentifier")
      `);

      // Mark the 2.6 rename and syncable commands completed so the cursor
      // resolver switches RolePermissionFlagEntity to core.rolePermissionFlag.
      for (const commandName of [
        '2.6.0_RenamePermissionFlagToRolePermissionFlagFastInstanceCommand_1778235340020',
        '2.6.0_PermissionFlagSyncableEntityFastInstanceCommand_1778235340021',
      ]) {
        await queryRunner.query(
          `INSERT INTO core."upgradeMigration" (
             id, name, status, attempt, "executedByVersion",
             "errorMessage", "isInitial", "workspaceId", "createdAt"
           )
           SELECT
             gen_random_uuid(), $1, 'completed',
             COALESCE(MAX(attempt), 0) + 1,
             '2.9.0', NULL, false, NULL, NOW()
           FROM core."upgradeMigration"
           WHERE name = $1 AND "workspaceId" IS NULL`,
          [commandName],
        );
      }
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentionally no-op: this is a one-time emergency repair.
  }
}
