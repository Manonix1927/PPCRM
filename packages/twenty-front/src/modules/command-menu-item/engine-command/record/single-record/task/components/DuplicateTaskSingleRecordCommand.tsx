import { useDuplicateTask } from '@/activities/tasks/hooks/useDuplicateTask';
import { HeadlessEngineCommandWrapperEffect } from '@/command-menu-item/engine-command/components/HeadlessEngineCommandWrapperEffect';
import { useHeadlessCommandContextApi } from '@/command-menu-item/engine-command/hooks/useHeadlessCommandContextApi';
import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

export const DuplicateTaskSingleRecordCommand = () => {
  const { selectedRecords } = useHeadlessCommandContextApi();

  const recordId = selectedRecords[0]?.id;
  const { duplicateTask } = useDuplicateTask();
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();
  const { t } = useLingui();

  if (!isDefined(recordId)) {
    throw new Error('Record ID is required to duplicate task');
  }

  const handleExecute = async () => {
    const result = await duplicateTask(recordId);

    if (isDefined(result) && isNonEmptyString(result.id)) {
      enqueueSuccessSnackBar({
        message: t`Task duplicated successfully`,
      });

      openRecordInSidePanel({
        recordId: result.id,
        objectNameSingular: CoreObjectNameSingular.Task,
      });
    } else {
      enqueueErrorSnackBar({
        message: t`Failed to duplicate task`,
      });
    }
  };

  return <HeadlessEngineCommandWrapperEffect execute={handleExecute} />;
};
