import { type UpgradeMigrationService } from 'src/engine/core-modules/upgrade/services/upgrade-migration.service';
import { type UpgradeStep } from 'src/engine/core-modules/upgrade/services/upgrade-sequence-reader.service';

// Index of the furthest instance step recorded as completed. Steps before it
// were passed by the cursor, so a pending one there was inserted retroactively
// and `upgrade` will never reach it; steps after it are left to `upgrade`.
export const getInstanceCursorIndex = async ({
  sequence,
  upgradeMigrationService,
}: {
  sequence: UpgradeStep[];
  upgradeMigrationService: UpgradeMigrationService;
}): Promise<number> => {
  let cursorIndex = -1;

  for (const [index, step] of sequence.entries()) {
    if (step.kind === 'workspace') {
      continue;
    }

    const isCompleted = await upgradeMigrationService.isLastAttemptCompleted({
      name: step.name,
      workspaceId: null,
    });

    if (isCompleted) {
      cursorIndex = index;
    }
  }

  return cursorIndex;
};
