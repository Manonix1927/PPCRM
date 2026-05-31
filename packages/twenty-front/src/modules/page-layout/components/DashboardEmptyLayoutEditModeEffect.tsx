import { isLayoutCustomizationModeEnabledState } from '@/layout-customization/states/isLayoutCustomizationModeEnabledState';
import { useBasePageLayout } from '@/page-layout/hooks/useBasePageLayout';
import { useIsDashboardPageLayoutInEditMode } from '@/page-layout/hooks/useIsDashboardPageLayoutInEditMode';
import { useSetIsPageLayoutInEditMode } from '@/page-layout/hooks/useSetIsPageLayoutInEditMode';
import { PageLayoutComponentInstanceContext } from '@/page-layout/states/contexts/PageLayoutComponentInstanceContext';
import { isPageLayoutEmpty } from '@/page-layout/utils/isPageLayoutEmpty';
import { useAvailableComponentInstanceIdOrThrow } from '@/ui/utilities/state/component-state/hooks/useAvailableComponentInstanceIdOrThrow';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useEffect } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { PageLayoutType } from '~/generated-metadata/graphql';

export const DashboardEmptyLayoutEditModeEffect = () => {
  const pageLayoutId = useAvailableComponentInstanceIdOrThrow(
    PageLayoutComponentInstanceContext,
  );

  const pageLayout = useBasePageLayout(pageLayoutId);
  const isLayoutCustomizationModeEnabled = useAtomStateValue(
    isLayoutCustomizationModeEnabledState,
  );
  const isDashboardInEditMode =
    useIsDashboardPageLayoutInEditMode(pageLayoutId);
  const { setIsPageLayoutInEditMode } =
    useSetIsPageLayoutInEditMode(pageLayoutId);

  useEffect(() => {
    if (isLayoutCustomizationModeEnabled) {
      return;
    }

    if (!isDefined(pageLayout) || pageLayout.type !== PageLayoutType.DASHBOARD) {
      return;
    }

    if (!isPageLayoutEmpty(pageLayout) || isDashboardInEditMode) {
      return;
    }

    setIsPageLayoutInEditMode(true);
  }, [
    isDashboardInEditMode,
    isLayoutCustomizationModeEnabled,
    pageLayout,
    setIsPageLayoutInEditMode,
  ]);

  return null;
};
