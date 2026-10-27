import { HeadlessEngineCommandWrapperEffect } from '@/command-menu-item/engine-command/components/HeadlessEngineCommandWrapperEffect';
import { useHeadlessCommandContextApi } from '@/command-menu-item/engine-command/hooks/useHeadlessCommandContextApi';
import { getResolvedDashboardPageLayoutIdForRecord } from '@/command-menu-item/utils/enrichDashboardSelectedRecordsForCommandMenu';
import { useSetIsPageLayoutInEditMode } from '@/page-layout/hooks/useSetIsPageLayoutInEditMode';
import { currentPageLayoutIdState } from '@/page-layout/states/currentPageLayoutIdState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useResetLocationHash } from '@/ui/navigation/hooks/useResetLocationHash';
import { isDefined } from 'twenty-shared/utils';
import { doNotTranslate } from 'twenty-shared/i18n';

export const EditDashboardSingleRecordCommand = () => {
  const { selectedRecords } = useHeadlessCommandContextApi();
  const selectedRecord = selectedRecords[0];
  const currentPageLayoutId = useAtomStateValue(currentPageLayoutIdState);

  if (!isDefined(selectedRecord)) {
    throw new Error(
      doNotTranslate('Selected record is required to edit dashboard'),
    );
  }

  const pageLayoutId = getResolvedDashboardPageLayoutIdForRecord(
    selectedRecord,
    currentPageLayoutId,
  );

  if (!isDefined(pageLayoutId)) {
    throw new Error('Page layout ID is required to edit dashboard');
  }

  const { setIsPageLayoutInEditMode } =
    useSetIsPageLayoutInEditMode(pageLayoutId);

  const { resetLocationHash } = useResetLocationHash();

  const handleExecute = () => {
    setIsPageLayoutInEditMode(true);
    resetLocationHash();
  };

  return <HeadlessEngineCommandWrapperEffect execute={handleExecute} />;
};
