import { SidePanelRecordPage } from '@/side-panel/pages/record-page/components/SidePanelRecordPage';
import { viewableRecordIdComponentState } from '@/side-panel/pages/record-page/states/viewableRecordIdComponentState';
import { viewableRecordNameSingularComponentState } from '@/side-panel/pages/record-page/states/viewableRecordNameSingularComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { isNonEmptyString } from '@sniptt/guards';

// Only mount SidePanelRecordPage when the side panel actually has a record
// context. Navigating to Settings (or any non-record route) while a record side
// panel is open keeps the panel on the ViewRecord page with an empty record
// context, which makes SidePanelRecordPage throw and white-screens the app.
// Rendering nothing in that case keeps the app usable.
export const SidePanelRecordPageGuard = () => {
  const viewableRecordNameSingular = useAtomComponentStateValue(
    viewableRecordNameSingularComponentState,
  );
  const viewableRecordId = useAtomComponentStateValue(
    viewableRecordIdComponentState,
  );

  if (
    !isNonEmptyString(viewableRecordNameSingular) ||
    !isNonEmptyString(viewableRecordId)
  ) {
    return null;
  }

  return <SidePanelRecordPage />;
};
