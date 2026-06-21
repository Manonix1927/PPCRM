import { useParams } from 'react-router-dom';

import { SidePanelToggleButton } from '@/side-panel/components/SidePanelToggleButton';
import { RecordShowCommandMenu } from '@/command-menu-item/components/RecordShowCommandMenu';
import { CommandMenuComponentInstanceContext } from '@/command-menu/states/contexts/CommandMenuComponentInstanceContext';
import { TimelineActivityContext } from '@/activities/timeline-activities/contexts/TimelineActivityContext';
import { MAIN_CONTEXT_STORE_INSTANCE_ID } from '@/context-store/constants/MainContextStoreInstanceId';
import { ContextStoreComponentInstanceContext } from '@/context-store/states/contexts/ContextStoreComponentInstanceContext';
import { isLayoutCustomizationModeEnabledState } from '@/layout-customization/states/isLayoutCustomizationModeEnabledState';
import { RecordComponentInstanceContextsWrapper } from '@/object-record/components/RecordComponentInstanceContextsWrapper';
import { PageLayoutRecordPageRenderer } from '@/object-record/record-show/components/PageLayoutRecordPageRenderer';
import { RecordShowPageSSESubscribeEffect } from '@/object-record/record-show/components/RecordShowPageSSESubscribeEffect';
import { useRecordShowPage } from '@/object-record/record-show/hooks/useRecordShowPage';
import { computeRecordShowComponentInstanceId } from '@/object-record/record-show/utils/computeRecordShowComponentInstanceId';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isNonEmptyString } from '@sniptt/guards';
import { RecordShowPageHeader } from '~/pages/object-record/RecordShowPageHeader';
import { RecordShowPageTitle } from '~/pages/object-record/RecordShowPageTitle';

// Render record content only when the route actually carries both params.
// When navigating away from a record (e.g. to Settings) React Router can
// re-render this route once with empty params, which would feed '' into
// useObjectMetadataItem and throw, white-screening the app.
export const RecordShowPage = () => {
  const parameters = useParams<{
    objectNameSingular: string;
    objectRecordId: string;
  }>();

  if (
    !isNonEmptyString(parameters.objectNameSingular) ||
    !isNonEmptyString(parameters.objectRecordId)
  ) {
    return null;
  }

  return (
    <RecordShowPageContent
      paramObjectNameSingular={parameters.objectNameSingular}
      paramObjectRecordId={parameters.objectRecordId}
    />
  );
};

const RecordShowPageContent = ({
  paramObjectNameSingular,
  paramObjectRecordId,
}: {
  paramObjectNameSingular: string;
  paramObjectRecordId: string;
}) => {
  const isLayoutCustomizationModeEnabled = useAtomStateValue(
    isLayoutCustomizationModeEnabledState,
  );

  const { objectNameSingular, objectRecordId } = useRecordShowPage(
    paramObjectNameSingular,
    paramObjectRecordId,
  );

  const recordShowComponentInstanceId =
    computeRecordShowComponentInstanceId(objectRecordId);

  return (
    <RecordComponentInstanceContextsWrapper
      componentInstanceId={recordShowComponentInstanceId}
    >
      <ContextStoreComponentInstanceContext.Provider
        value={{ instanceId: MAIN_CONTEXT_STORE_INSTANCE_ID }}
      >
        <CommandMenuComponentInstanceContext.Provider
          value={{ instanceId: recordShowComponentInstanceId }}
        >
          <RecordShowPageTitle
            objectNameSingular={objectNameSingular}
            objectRecordId={objectRecordId}
          />
          <PageCardLayout
            header={
              <RecordShowPageHeader
                objectNameSingular={objectNameSingular}
                objectRecordId={objectRecordId}
              >
                <RecordShowCommandMenu />
                {!isLayoutCustomizationModeEnabled && <SidePanelToggleButton />}
              </RecordShowPageHeader>
            }
          >
            <TimelineActivityContext.Provider
              value={{
                recordId: objectRecordId,
              }}
            >
              <PageLayoutRecordPageRenderer
                targetRecordIdentifier={{
                  id: objectRecordId,
                  targetObjectNameSingular: objectNameSingular,
                }}
                isInSidePanel={false}
              />
              <RecordShowPageSSESubscribeEffect
                objectNameSingular={objectNameSingular}
                recordId={objectRecordId}
              />
            </TimelineActivityContext.Provider>
          </PageCardLayout>
        </CommandMenuComponentInstanceContext.Provider>
      </ContextStoreComponentInstanceContext.Provider>
    </RecordComponentInstanceContextsWrapper>
  );
};
