import { Logger } from '@nestjs/common';

import chalk from 'chalk';
import { Command, CommandRunner, Option } from 'nest-commander';

import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { UpgradeMigrationService } from 'src/engine/core-modules/upgrade/services/upgrade-migration.service';
import {
  UpgradeSequenceReaderService,
  type WorkspaceUpgradeStep,
} from 'src/engine/core-modules/upgrade/services/upgrade-sequence-reader.service';
import { UpgradeStatusService } from 'src/engine/core-modules/upgrade/services/upgrade-status.service';
import { WorkspaceCommandRunnerService } from 'src/engine/core-modules/upgrade/services/workspace-command-runner.service';
import { WorkspaceVersionService } from 'src/engine/workspace-manager/workspace-version/services/workspace-version.service';

type RunWorkspaceCommandsOptions = {
  dryRun?: boolean;
  fromVersion?: string;
};

const parseVersion = (version: string): number[] =>
  version.split('.').map((part) => parseInt(part, 10) || 0);

const isVersionAtLeast = (version: string, floor: string): boolean => {
  const parsedVersion = parseVersion(version);
  const parsedFloor = parseVersion(floor);

  for (
    let index = 0;
    index < Math.max(parsedVersion.length, parsedFloor.length);
    index++
  ) {
    const versionPart = parsedVersion[index] ?? 0;
    const floorPart = parsedFloor[index] ?? 0;

    if (versionPart !== floorPart) {
      return versionPart > floorPart;
    }
  }

  return true;
};

// The cursor-driven `upgrade` command only replays the segment a workspace's
// cursor points at, so a workspace command that lands behind an already-passed
// cursor is skipped forever. This walks the whole sequence instead and runs
// every workspace command whose last attempt is not recorded as completed.
@Command({
  name: 'run-workspace-commands',
  description:
    'Run every registered workspace command that has not completed yet, ignoring the upgrade cursor',
})
export class RunWorkspaceCommandsCommand extends CommandRunner {
  private readonly logger = new Logger(RunWorkspaceCommandsCommand.name);

  constructor(
    private readonly workspaceVersionService: WorkspaceVersionService,
    private readonly workspaceIteratorService: WorkspaceIteratorService,
    private readonly upgradeSequenceReaderService: UpgradeSequenceReaderService,
    private readonly workspaceCommandRunnerService: WorkspaceCommandRunnerService,
    private readonly upgradeMigrationService: UpgradeMigrationService,
    private readonly upgradeStatusService: UpgradeStatusService,
  ) {
    super();
  }

  @Option({
    flags: '-d, --dry-run',
    description: 'List the pending commands without running them',
    required: false,
  })
  parseDryRun(): boolean {
    return true;
  }

  // Commands older than the version tracking was reliable for are already
  // applied without being recorded, and several of them drop tables or fields,
  // so replaying them would be destructive.
  @Option({
    flags: '--from-version [version]',
    description:
      'Only consider workspace commands registered at this version or later, e.g. 2.18.0',
    required: false,
  })
  parseFromVersion(value: string): string {
    return value;
  }

  async run(
    _passedParams: string[],
    options: RunWorkspaceCommandsOptions,
  ): Promise<void> {
    try {
      const workspaceIds =
        await this.workspaceVersionService.getProvisionedWorkspaceIds();

      if (workspaceIds.length === 0) {
        this.logger.log('No provisioned workspace, nothing to run');

        return;
      }

      const allWorkspaceCommands = this.upgradeSequenceReaderService
        .getUpgradeSequence()
        .filter(
          (step): step is WorkspaceUpgradeStep => step.kind === 'workspace',
        )
        .filter(
          (step) =>
            !options.fromVersion ||
            isVersionAtLeast(step.version, options.fromVersion),
        );

      this.logger.log(
        `Considering ${allWorkspaceCommands.length} workspace command(s)${
          options.fromVersion ? ` from version ${options.fromVersion}` : ''
        }`,
      );

      const report = await this.workspaceIteratorService.iterate({
        workspaceIds,
        dryRun: options.dryRun,
        callback: async (context) => {
          const pendingCommands = await this.getPendingWorkspaceCommands({
            allWorkspaceCommands,
            workspaceId: context.workspaceId,
          });

          if (pendingCommands.length === 0) {
            this.logger.log(
              `Workspace ${context.workspaceId} has no pending workspace command`,
            );

            return;
          }

          this.logger.log(
            `Workspace ${context.workspaceId} has ${pendingCommands.length} pending workspace command(s): ${pendingCommands
              .map((command) => command.name)
              .join(', ')}`,
          );

          if (options.dryRun) {
            return;
          }

          await this.workspaceCommandRunnerService.runWorkspaceCommands({
            iteratorContext: context,
            options: { dryRun: false },
            workspaceCommands: pendingCommands,
          });
        },
      });

      if (report.fail.length > 0) {
        throw new Error(
          `Workspace commands failed for ${report.fail.length} workspace(s): ${report.fail
            .map(({ workspaceId }) => workspaceId)
            .join(', ')}`,
        );
      }

      this.logger.log(chalk.green('Workspace commands completed'));
    } catch (error) {
      this.logger.error(
        chalk.red(`Workspace commands failed: ${error.message}`),
      );
      throw error;
    } finally {
      await this.safeInvalidateUpgradeStatusCache();
    }
  }

  private async getPendingWorkspaceCommands({
    allWorkspaceCommands,
    workspaceId,
  }: {
    allWorkspaceCommands: WorkspaceUpgradeStep[];
    workspaceId: string;
  }): Promise<WorkspaceUpgradeStep[]> {
    const pendingCommands: WorkspaceUpgradeStep[] = [];

    for (const workspaceCommand of allWorkspaceCommands) {
      const isCompleted =
        await this.upgradeMigrationService.isLastAttemptCompleted({
          name: workspaceCommand.name,
          workspaceId,
        });

      if (!isCompleted) {
        pendingCommands.push(workspaceCommand);
      }
    }

    return pendingCommands;
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
}
