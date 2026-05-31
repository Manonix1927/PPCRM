import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

const RENAME_PERMISSION_FLAG_COMMAND =
  '2.6.0_RenamePermissionFlagToRolePermissionFlagFastInstanceCommand_1778235340020';
const PERMISSION_FLAG_SYNCABLE_COMMAND =
  '2.6.0_PermissionFlagSyncableEntityFastInstanceCommand_1778235340021';
const LINK_ROLE_PERMISSION_FLAG_COMMAND =
  '2.6.0_LinkRolePermissionFlagToPermissionFlagFastInstanceCommand_1778235340022';

type PermissionFlagSchemaState = {
  permissionFlagIsCatalog: boolean;
  permissionFlagHasRoleId: boolean;
  rolePermissionFlagExists: boolean;
  rolePermissionFlagHasRoleId: boolean;
  rolePermissionFlagHasPermissionFlagId: boolean;
};

const getPermissionFlagSchemaState = async (
  queryRunner: QueryRunner,
): Promise<PermissionFlagSchemaState> => {
  const [state] = await queryRunner.query(`
    SELECT
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'core'
          AND table_name = 'permissionFlag'
          AND column_name = 'key'
      ) AS "permissionFlagIsCatalog",
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
          AND table_name = 'rolePermissionFlag'
          AND column_name = 'roleId'
      ) AS "rolePermissionFlagHasRoleId",
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'core'
          AND table_name = 'rolePermissionFlag'
          AND column_name = 'permissionFlagId'
      ) AS "rolePermissionFlagHasPermissionFlagId"
  `);

  return state as PermissionFlagSchemaState;
};

const ensureInstanceCommandMarkedCompleted = async (
  queryRunner: QueryRunner,
  commandName: string,
): Promise<void> => {
  const [latestAttempt] = await queryRunner.query(
    `SELECT status
     FROM core."upgradeMigration"
     WHERE name = $1 AND "workspaceId" IS NULL
     ORDER BY attempt DESC
     LIMIT 1`,
    [commandName],
  );

  if (latestAttempt?.status === 'completed') {
    return;
  }

  await queryRunner.query(
    `INSERT INTO core."upgradeMigration" (
       id,
       name,
       status,
       attempt,
       "executedByVersion",
       "errorMessage",
       "isInitial",
       "workspaceId",
       "createdAt"
     )
     SELECT
       gen_random_uuid(),
       $1,
       'completed',
       COALESCE(MAX(attempt), 0) + 1,
       '2.9.0',
       NULL,
       false,
       NULL,
       NOW()
     FROM core."upgradeMigration"
     WHERE name = $1 AND "workspaceId" IS NULL`,
    [commandName],
  );
};

const createRolePermissionFlagTable = async (
  queryRunner: QueryRunner,
): Promise<void> => {
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS "core"."rolePermissionFlag" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "workspaceId" uuid NOT NULL,
      "applicationId" uuid NOT NULL,
      "universalIdentifier" uuid NOT NULL,
      "roleId" uuid NOT NULL,
      "flag" varchar NOT NULL,
      "permissionFlagId" uuid,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_76591adc8035c2e7b0cd6115136" PRIMARY KEY ("id")
    )
  `);

  await queryRunner.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "IDX_e4559ae0dba56e53714137c704"
    ON "core"."rolePermissionFlag" ("workspaceId", "universalIdentifier")
  `);

  await queryRunner.query(`
    CREATE INDEX IF NOT EXISTS "IDX_ROLE_PERMISSION_FLAG_ROLE_ID"
    ON "core"."rolePermissionFlag" ("roleId")
  `);

  await queryRunner.query(`
    CREATE INDEX IF NOT EXISTS "IDX_ROLE_PERMISSION_FLAG_PERMISSION_FLAG_ID"
    ON "core"."rolePermissionFlag" ("permissionFlagId")
  `);
};

@RegisteredInstanceCommand('2.9.0', 1799000060000)
export class RepairRolePermissionFlagUpgradeCursorFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const schemaState = await getPermissionFlagSchemaState(queryRunner);

    if (
      schemaState.permissionFlagIsCatalog &&
      !schemaState.rolePermissionFlagExists
    ) {
      await createRolePermissionFlagTable(queryRunner);
    }

    const isPostCutoverSchema =
      schemaState.permissionFlagIsCatalog &&
      schemaState.rolePermissionFlagExists &&
      schemaState.rolePermissionFlagHasRoleId;

    if (!isPostCutoverSchema) {
      return;
    }

    // Schema already matches 2.6+, but upgrade cursor may still point before the
    // rename step (e.g. stale/failed rows in upgradeMigration). Mark the 2.6
    // permission-flag instance commands completed so RolePermissionFlagEntity
    // resolves to core.rolePermissionFlag instead of core.permissionFlag.
    await ensureInstanceCommandMarkedCompleted(
      queryRunner,
      RENAME_PERMISSION_FLAG_COMMAND,
    );
    await ensureInstanceCommandMarkedCompleted(
      queryRunner,
      PERMISSION_FLAG_SYNCABLE_COMMAND,
    );

    if (schemaState.rolePermissionFlagHasPermissionFlagId) {
      await ensureInstanceCommandMarkedCompleted(
        queryRunner,
        LINK_ROLE_PERMISSION_FLAG_COMMAND,
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentionally no-op: this command repairs production schema/cursor drift.
  }
}
