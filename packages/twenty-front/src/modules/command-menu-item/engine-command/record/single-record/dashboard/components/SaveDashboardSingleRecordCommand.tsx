import { HeadlessEngineCommandWrapperEffect } from '@/command-menu-item/engine-command/components/HeadlessEngineCommandWrapperEffect';
import { useHeadlessCommandContextApi } from '@/command-menu-item/engine-command/hooks/useHeadlessCommandContextApi';
import { getResolvedDashboardPageLayoutIdForRecord } from '@/command-menu-item/utils/enrichDashboardSelectedRecordsForCommandMenu';
import { useSavePageLayout } from '@/page-layout/hooks/useSavePageLayout';
import { useSavePageLayoutWidgetsData } from '@/page-layout/hooks/useSavePageLayoutWidgetsData';
import { useSetIsPageLayoutInEditMode } from '@/page-layout/hooks/useSetIsPageLayoutInEditMode';
import { currentPageLayoutIdState } from '@/page-layout/states/currentPageLayoutIdState';
import { useSidePanelMenu } from '@/side-panel/hooks/useSidePanelMenu';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isDefined } from 'twenty-shared/utils';

export const SaveDashboardSingleRecordCommand = () => {
  const { selectedRecords } = useHeadlessCommandContextApi();
  const selectedRecord = selectedRecords[0];
  const currentPageLayoutId = useAtomStateValue(currentPageLayoutIdState);

  if (!isDefined(selectedRecord)) {
    throw new Error('Selected record is required to save dashboard');
  }

  const pageLayoutId = getResolvedDashboardPageLayoutIdForRecord(
    selectedRecord,
    currentPageLayoutId,
  );

  if (!isDefined(pageLayoutId)) {
    throw new Error('Page layout ID is required to save dashboard');
  }

  const { savePageLayout } = useSavePageLayout(pageLayoutId);

  const { savePageLayoutWidgetsData } = useSavePageLayoutWidgetsData();

  const { setIsPageLayoutInEditMode } =
    useSetIsPageLayoutInEditMode(pageLayoutId);

  const { closeSidePanelMenu } = useSidePanelMenu();

  const handleExecute = async () => {
    const result = await savePageLayout();

    if (result.status === 'successful') {
      await savePageLayoutWidgetsData(pageLayoutId);
      closeSidePanelMenu();
      setIsPageLayoutInEditMode(false);
    }
  };

  return <HeadlessEngineCommandWrapperEffect execute={handleExecute} />;
};
