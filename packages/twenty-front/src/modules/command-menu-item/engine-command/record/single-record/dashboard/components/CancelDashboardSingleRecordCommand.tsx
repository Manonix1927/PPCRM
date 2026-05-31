import { HeadlessEngineCommandWrapperEffect } from '@/command-menu-item/engine-command/components/HeadlessEngineCommandWrapperEffect';
import { useHeadlessCommandContextApi } from '@/command-menu-item/engine-command/hooks/useHeadlessCommandContextApi';
import { getResolvedDashboardPageLayoutIdForRecord } from '@/command-menu-item/utils/enrichDashboardSelectedRecordsForCommandMenu';
import { useResetDraftPageLayoutToPersistedPageLayout } from '@/page-layout/hooks/useResetDraftPageLayoutToPersistedPageLayout';
import { useSetIsPageLayoutInEditMode } from '@/page-layout/hooks/useSetIsPageLayoutInEditMode';
import { currentPageLayoutIdState } from '@/page-layout/states/currentPageLayoutIdState';
import { getTabListInstanceIdFromPageLayoutAndRecord } from '@/page-layout/utils/getTabListInstanceIdFromPageLayoutAndRecord';
import { useSidePanelMenu } from '@/side-panel/hooks/useSidePanelMenu';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isDefined } from 'twenty-shared/utils';
import { PageLayoutType } from '~/generated-metadata/graphql';

export const CancelDashboardSingleRecordCommand = () => {
  const { selectedRecords } = useHeadlessCommandContextApi();
  const selectedRecord = selectedRecords[0];
  const currentPageLayoutId = useAtomStateValue(currentPageLayoutIdState);

  if (!isDefined(selectedRecord)) {
    throw new Error('Selected record is required to cancel dashboard');
  }

  const pageLayoutId = getResolvedDashboardPageLayoutIdForRecord(
    selectedRecord,
    currentPageLayoutId,
  );

  if (!isDefined(pageLayoutId)) {
    throw new Error('Page layout ID is required to cancel dashboard');
  }

  const tabListInstanceId = getTabListInstanceIdFromPageLayoutAndRecord({
    pageLayoutId,
    layoutType: PageLayoutType.DASHBOARD,
    targetRecordIdentifier: {
      id: selectedRecord.id,
      targetObjectNameSingular: '',
    },
  });

  const { closeSidePanelMenu } = useSidePanelMenu();

  const { setIsPageLayoutInEditMode } =
    useSetIsPageLayoutInEditMode(pageLayoutId);

  const { resetDraftPageLayoutToPersistedPageLayout } =
    useResetDraftPageLayoutToPersistedPageLayout({
      pageLayoutId,
      tabListInstanceId,
    });

  const handleExecute = () => {
    closeSidePanelMenu();

    resetDraftPageLayoutToPersistedPageLayout();
    setIsPageLayoutInEditMode(false);
  };

  return <HeadlessEngineCommandWrapperEffect execute={handleExecute} />;
};
