import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('1.23.0', 1786000000000)
export class AddRelativeDateViewFilterOperandsFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TYPE "core"."viewFilter_operand_enum" RENAME TO "viewFilter_operand_enum_old"',
    );
    await queryRunner.query(
      `CREATE TYPE "core"."viewFilter_operand_enum" AS ENUM('IS', 'IS_NOT_NULL', 'IS_NOT', 'LESS_THAN_OR_EQUAL', 'GREATER_THAN_OR_EQUAL', 'IS_BEFORE', 'IS_AFTER', 'CONTAINS', 'DOES_NOT_CONTAIN', 'IS_EMPTY', 'IS_NOT_EMPTY', 'IS_RELATIVE', 'IS_IN_PAST', 'IS_IN_FUTURE', 'IS_TODAY', 'IS_YESTERDAY', 'IS_TOMORROW', 'IS_THIS_WEEK', 'IS_LAST_WEEK', 'IS_NEXT_WEEK', 'VECTOR_SEARCH')`,
    );
    await queryRunner.query(
      'ALTER TABLE "core"."viewFilter" ALTER COLUMN "operand" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "core"."viewFilter" ALTER COLUMN "operand" TYPE "core"."viewFilter_operand_enum" USING "operand"::"text"::"core"."viewFilter_operand_enum"',
    );
    await queryRunner.query(
      `ALTER TABLE "core"."viewFilter" ALTER COLUMN "operand" SET DEFAULT 'CONTAINS'`,
    );
    await queryRunner.query(
      'DROP TYPE "core"."viewFilter_operand_enum_old"',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "core"."viewFilter_operand_enum_old" AS ENUM('IS', 'IS_NOT_NULL', 'IS_NOT', 'LESS_THAN_OR_EQUAL', 'GREATER_THAN_OR_EQUAL', 'IS_BEFORE', 'IS_AFTER', 'CONTAINS', 'DOES_NOT_CONTAIN', 'IS_EMPTY', 'IS_NOT_EMPTY', 'IS_RELATIVE', 'IS_IN_PAST', 'IS_IN_FUTURE', 'IS_TODAY', 'VECTOR_SEARCH')`,
    );
    await queryRunner.query(
      'ALTER TABLE "core"."viewFilter" ALTER COLUMN "operand" DROP DEFAULT',
    );
    await queryRunner.query(
      `UPDATE "core"."viewFilter" SET "operand" = 'IS_TODAY' WHERE "operand" IN ('IS_YESTERDAY', 'IS_TOMORROW', 'IS_THIS_WEEK', 'IS_LAST_WEEK', 'IS_NEXT_WEEK')`,
    );
    await queryRunner.query(
      'ALTER TABLE "core"."viewFilter" ALTER COLUMN "operand" TYPE "core"."viewFilter_operand_enum_old" USING "operand"::"text"::"core"."viewFilter_operand_enum_old"',
    );
    await queryRunner.query(
      `ALTER TABLE "core"."viewFilter" ALTER COLUMN "operand" SET DEFAULT 'CONTAINS'`,
    );
    await queryRunner.query(
      'DROP TYPE "core"."viewFilter_operand_enum"',
    );
    await queryRunner.query(
      'ALTER TYPE "core"."viewFilter_operand_enum_old" RENAME TO "viewFilter_operand_enum"',
    );
  }
}
