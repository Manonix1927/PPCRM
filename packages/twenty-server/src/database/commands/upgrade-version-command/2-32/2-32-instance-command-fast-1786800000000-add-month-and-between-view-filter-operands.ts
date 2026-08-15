import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

const ADDED_OPERANDS = [
  'IS_THIS_MONTH',
  'IS_LAST_MONTH',
  'IS_NEXT_MONTH',
  'IS_BETWEEN',
] as const;

@RegisteredInstanceCommand('2.32.0', 1786800000000)
export class AddMonthAndBetweenViewFilterOperandsFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const operand of ADDED_OPERANDS) {
      await queryRunner.query(
        `ALTER TYPE "core"."viewFilter_operand_enum" ADD VALUE IF NOT EXISTS '${operand}'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres cannot drop a value from an enum, so the rows using the new
    // operands are folded back onto IS_TODAY and the values are left in place.
    await queryRunner.query(
      `UPDATE "core"."viewFilter" SET "operand" = 'IS_TODAY' WHERE "operand" IN (${ADDED_OPERANDS.map(
        (operand) => `'${operand}'`,
      ).join(', ')})`,
    );
  }
}
