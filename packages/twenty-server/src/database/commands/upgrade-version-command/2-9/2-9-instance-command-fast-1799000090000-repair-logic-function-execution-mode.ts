import { type QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { type FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

const hasLogicFunctionExecutionModeColumn = async (
  queryRunner: QueryRunner,
): Promise<boolean> => {
  const [result] = await queryRunner.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'core'
        AND table_name = 'logicFunction'
        AND column_name = 'executionMode'
    ) AS "hasExecutionModeColumn"
  `);

  return result.hasExecutionModeColumn === true;
};

@RegisteredInstanceCommand('2.9.0', 1799000090000)
export class RepairLogicFunctionExecutionModeFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasExecutionModeColumn =
      await hasLogicFunctionExecutionModeColumn(queryRunner);

    if (hasExecutionModeColumn) {
      await queryRunner.query(`
        UPDATE "core"."logicFunction"
        SET "executionMode" = 'LIVE'
        WHERE "executionMode" IS NULL
      `);

      return;
    }

    // PPCRM production may have already recorded 1799000030000 for a different
    // migration, so upstream's AddLogicFunctionExecutionMode never ran.
    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE "core"."logicFunction_executionmode_enum"
          AS ENUM('LIVE', 'PREBUILT');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "core"."logicFunction"
      ADD COLUMN IF NOT EXISTS "executionMode"
        "core"."logicFunction_executionmode_enum" NOT NULL DEFAULT 'LIVE'
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentionally no-op: this command repairs production schema drift.
  }
}
