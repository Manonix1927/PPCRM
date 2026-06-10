import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddCacheTokensToAgentChatThread1777455269302
  implements MigrationInterface
{
  name = 'AddCacheTokensToAgentChatThread1777455269302';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."agentChatThread" ADD COLUMN IF NOT EXISTS "totalCacheReadTokens" bigint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."agentChatThread" ADD COLUMN IF NOT EXISTS "totalCacheCreationTokens" bigint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."agentChatThread" DROP COLUMN IF EXISTS "totalCacheCreationTokens"`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."agentChatThread" DROP COLUMN IF EXISTS "totalCacheReadTokens"`,
    );
  }
}

