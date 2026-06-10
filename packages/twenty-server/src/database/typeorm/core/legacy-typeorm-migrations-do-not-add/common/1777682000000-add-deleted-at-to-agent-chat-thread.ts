import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddDeletedAtToAgentChatThread1777682000000
  implements MigrationInterface
{
  name = 'AddDeletedAtToAgentChatThread1777682000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."agentChatThread" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_AGENT_CHAT_THREAD_ID_DELETED_AT" ON "core"."agentChatThread" ("id", "deletedAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "core"."IDX_AGENT_CHAT_THREAD_ID_DELETED_AT"`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."agentChatThread" DROP COLUMN IF EXISTS "deletedAt"`,
    );
  }
}

