import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

import { DataSource } from 'typeorm';

import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { type FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';
import { type SlowInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/slow-instance-command.interface';
import { UpgradeMigrationService } from 'src/engine/core-modules/upgrade/services/upgrade-migration.service';
import { UpgradeStatusService } from 'src/engine/core-modules/upgrade/services/upgrade-status.service';
import { WorkspaceVersionService } from 'src/engine/workspace-manager/workspace-version/services/workspace-version.service';

type RunSingleMigrationResult =
  | { status: 'success' }
  | { status: 'already-executed' }
  | { status: 'failed'; error: unknown };

const isIdempotentSchemaConflict = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const driverError = (error as { driverError?: unknown }).driverError;
  if (typeof driverError !== 'object' || driverError === null) {
    return false;
  }

  const code = (driverError as { code?: unknown }).code;
  // Postgres error codes we can safely treat as "already applied"
  // when running instance commands (schema changes):
  // - 42701 duplicate_column
  // - 42P07 duplicate_table
  // - 42710 duplicate_object (incl. constraints)
  // - 42P16 invalid_table_definition (e.g. constraint already exists in some cases)
  // - 42P04 duplicate_database (rare, but safe)
  return (
    code === '42701' ||
    code === '42P07' ||
    code === '42710' ||
    code === '42P16' ||
    code === '42P04'
  );
};

@Injectable()
export class InstanceCommandRunnerService {
  private readonly logger = new Logger(InstanceCommandRunnerService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly twentyConfigService: TwentyConfigService,
    private readonly upgradeMigrationService: UpgradeMigrationService,
    private readonly workspaceVersionService: WorkspaceVersionService,
    private readonly upgradeStatusService: UpgradeStatusService,
  ) {}

  async runFastInstanceCommand({
    command,
    name,
  }: {
    command: FastInstanceCommand;
    name: string;
  }): Promise<RunSingleMigrationResult> {
    const executedByVersion =
      this.twentyConfigService.get('APP_VERSION') ?? 'unknown';

    const isAlreadyCompleted =
      await this.upgradeMigrationService.isLastAttemptCompleted({
        name,
        workspaceId: null,
      });

    if (isAlreadyCompleted) {
      this.logger.log(`${name} already executed, skipping`);

      return { status: 'already-executed' };
    }

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      await command.up(queryRunner);

      const workspaceIds =
        await this.workspaceVersionService.getProvisionedWorkspaceIds({
          queryRunner,
        });

      await this.upgradeMigrationService.recordUpgradeMigration({
        name,
        workspaceIds,
        isInstance: true,
        status: 'completed',
        executedByVersion,
        queryRunner,
      });

      await queryRunner.commitTransaction();

      this.logger.log(`${name} executed successfully`);

      return { status: 'success' };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      if (isIdempotentSchemaConflict(error)) {
        this.logger.warn(
          `${name} reported a duplicate schema object. Marking as completed and continuing.`,
        );

        const workspaceIds =
          await this.workspaceVersionService.getProvisionedWorkspaceIds();

        await this.upgradeMigrationService.recordUpgradeMigration({
          name,
          workspaceIds,
          isInstance: true,
          status: 'completed',
          executedByVersion,
          queryRunner: undefined,
        });

        return { status: 'success' };
      }

      const workspaceIds =
        await this.workspaceVersionService.getProvisionedWorkspaceIds();

      await this.upgradeMigrationService.recordUpgradeMigration({
        name,
        workspaceIds,
        isInstance: true,
        status: 'failed',
        executedByVersion,
        error,
      });

      this.logger.error(
        `${name} failed`,
        error instanceof Error ? error.stack : String(error),
      );

      return { status: 'failed', error };
    } finally {
      await queryRunner.release();
      await this.safeInvalidateUpgradeStatusCache();
    }
  }

  private async safeInvalidateUpgradeStatusCache(): Promise<void> {
    try {
      await this.upgradeStatusService.invalidateInstanceAndAllWorkspacesStatus();
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate upgrade-status cache: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async runSlowInstanceCommand({
    command,
    name,
    skipDataMigration,
  }: {
    command: SlowInstanceCommand;
    name: string;
    skipDataMigration?: boolean;
  }): Promise<RunSingleMigrationResult> {
    const isAlreadyCompleted =
      await this.upgradeMigrationService.isLastAttemptCompleted({
        name,
        workspaceId: null,
      });

    if (isAlreadyCompleted) {
      this.logger.log(`${name} already executed, skipping`);

      return { status: 'already-executed' };
    }

    if (!skipDataMigration) {
      const executedByVersion =
        this.twentyConfigService.get('APP_VERSION') ?? 'unknown';

      try {
        this.logger.log(`${name} starting data migration...`);
        await command.runDataMigration(this.dataSource);
        this.logger.log(`${name} data migration completed`);
      } catch (error) {
        const workspaceIds =
          await this.workspaceVersionService.getProvisionedWorkspaceIds();

        await this.upgradeMigrationService.recordUpgradeMigration({
          name,
          workspaceIds,
          isInstance: true,
          status: 'failed',
          executedByVersion,
          error,
        });

        this.logger.error(
          `${name} data migration failed`,
          error instanceof Error ? error.stack : String(error),
        );

        await this.safeInvalidateUpgradeStatusCache();

        return { status: 'failed', error };
      }
    }

    return this.runFastInstanceCommand({
      command,
      name,
    });
  }
}
