import { useDuplicateTask } from '@/activities/tasks/hooks/useDuplicateTask';
import { HeadlessEngineCommandWrapperEffect } from '@/command-menu-item/engine-command/components/HeadlessEngineCommandWrapperEffect';
import { useHeadlessCommandContextApi } from '@/command-menu-item/engine-command/hooks/useHeadlessCommandContextApi';
import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { useToast } from 'twenty-ui/components/feedback';

export const DuplicateTaskSingleRecordCommand = () => {
  const { selectedRecords } = useHeadlessCommandContextApi();

  const recordId = selectedRecords[0]?.id;
  const { duplicateTask } = useDuplicateTask();
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();
  const { enqueueToast } = useToast();
  const { t } = useLingui();

  if (!isDefined(recordId)) {
    throw new Error('Record ID is required to duplicate task');
  }

  const handleExecute = async () => {
    const result = await duplicateTask(recordId);

    if (isDefined(result) && isNonEmptyString(result.id)) {
      enqueueToast({
        status: 'success',
        children: t`Task duplicated successfully`,
      });

      openRecordInSidePanel({
        recordId: result.id,
        objectNameSingular: CoreObjectNameSingular.Task,
      });
    } else {
      enqueueToast({
        status: 'error',
        children: t`Failed to duplicate task`,
      });
    }
  };

  return <HeadlessEngineCommandWrapperEffect execute={handleExecute} />;
};
