import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

type PermissionFlagSchemaState = {
  permissionFlagIsCatalog: boolean;
  permissionFlagHasRoleId: boolean;
  rolePermissionFlagExists: boolean;
  rolePermissionFlagHasRoleId: boolean;
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
      ) AS "rolePermissionFlagHasRoleId"
  `);

  return state as PermissionFlagSchemaState;
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

  await queryRunner.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'FK_d47b1ebee75d98daa0c870c26e3'
      ) THEN
        ALTER TABLE "core"."rolePermissionFlag"
        ADD CONSTRAINT "FK_d47b1ebee75d98daa0c870c26e3"
        FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);

  await queryRunner.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'FK_3835ecc1019327566d35728c8ba'
      ) THEN
        ALTER TABLE "core"."rolePermissionFlag"
        ADD CONSTRAINT "FK_3835ecc1019327566d35728c8ba"
        FOREIGN KEY ("applicationId") REFERENCES "core"."application"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);

  await queryRunner.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'FK_4c6ea38698de230b0ec18fa2110'
      ) THEN
        ALTER TABLE "core"."rolePermissionFlag"
        ADD CONSTRAINT "FK_4c6ea38698de230b0ec18fa2110"
        FOREIGN KEY ("roleId") REFERENCES "core"."role"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);

  await queryRunner.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'FK_8724e63323f1331591a3e91b0b3'
      ) THEN
        ALTER TABLE "core"."rolePermissionFlag"
        ADD CONSTRAINT "FK_8724e63323f1331591a3e91b0b3"
        FOREIGN KEY ("permissionFlagId") REFERENCES "core"."permissionFlag"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);
};

@RegisteredInstanceCommand('2.9.0', 1799000050000)
export class RepairRolePermissionFlagSchemaFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const schemaState = await getPermissionFlagSchemaState(queryRunner);

    const isHealthySchema =
      schemaState.permissionFlagIsCatalog &&
      schemaState.rolePermissionFlagExists &&
      schemaState.rolePermissionFlagHasRoleId;

    if (isHealthySchema) {
      return;
    }

    if (
      schemaState.permissionFlagHasRoleId &&
      !schemaState.rolePermissionFlagExists
    ) {
      return;
    }

    if (
      schemaState.permissionFlagIsCatalog &&
      !schemaState.rolePermissionFlagExists
    ) {
      await createRolePermissionFlagTable(queryRunner);
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentionally no-op: this command repairs production schema drift.
  }
}
