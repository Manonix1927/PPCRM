import { SidePanelRecordInfo } from '@/side-panel/components/SidePanelRecordInfo';
import { viewableRecordIdComponentState } from '@/side-panel/pages/record-page/states/viewableRecordIdComponentState';
import { viewableRecordNameSingularComponentState } from '@/side-panel/pages/record-page/states/viewableRecordNameSingularComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { isNonEmptyString } from '@sniptt/guards';

// SidePanelRecordInfo resolves the record via useRecordShowPage and throws when
// the record context is empty (e.g. a ViewRecord chip is still present after
// navigating to Settings). Guard it so the side panel top bar renders nothing
// for that chip instead of white-screening the app.
export const SidePanelRecordInfoGuard = ({
  sidePanelPageInstanceId,
}: {
  sidePanelPageInstanceId: string;
}) => {
  const viewableRecordNameSingular = useAtomComponentStateValue(
    viewableRecordNameSingularComponentState,
    sidePanelPageInstanceId,
  );
  const viewableRecordId = useAtomComponentStateValue(
    viewableRecordIdComponentState,
    sidePanelPageInstanceId,
  );

  if (
    !isNonEmptyString(viewableRecordNameSingular) ||
    !isNonEmptyString(viewableRecordId)
  ) {
    return null;
  }

  return (
    <SidePanelRecordInfo sidePanelPageInstanceId={sidePanelPageInstanceId} />
  );
};
