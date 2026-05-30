import { styled } from '@linaria/react';
import { Fragment, useMemo, useState } from 'react';

import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { RecordChip } from '@/object-record/components/RecordChip';
import { RecordFieldsScopeContextProvider } from '@/object-record/record-field-list/contexts/RecordFieldsScopeContext';
import { RecordDetailRecordsListContainer } from '@/object-record/record-field-list/record-detail-section/components/RecordDetailRecordsListContainer';
import { RecordDetailRecordsListItemContainer } from '@/object-record/record-field-list/record-detail-section/components/RecordDetailRecordsListItemContainer';
import { RecordDetailRelationRecordsListItemEffect } from '@/object-record/record-field-list/record-detail-section/relation/components/RecordDetailRelationRecordsListItemEffect';
import { FieldDisplay } from '@/object-record/record-field/ui/components/FieldDisplay';
import { FieldContextProvider } from '@/object-record/record-field/ui/components/FieldContextProvider';
import { type FieldDefinition } from '@/object-record/record-field/ui/types/FieldDefinition';
import { type FieldRelationMetadata } from '@/object-record/record-field/ui/types/FieldMetadata';
import { extractTargetRecordsFromJunction } from '@/object-record/record-field/ui/utils/junction/extractTargetRecordsFromJunction';
import { getJunctionConfig } from '@/object-record/record-field/ui/utils/junction/getJunctionConfig';
import { currentPageLayoutIdState } from '@/page-layout/states/currentPageLayoutIdState';
import { FieldWidgetShowMoreButton } from '@/page-layout/widgets/field/components/FieldWidgetShowMoreButton';
import { FIELD_WIDGET_RELATION_CARD_INITIAL_VISIBLE_ITEMS } from '@/page-layout/widgets/field/constants/FieldWidgetRelationCardInitialVisibleItems';
import { FIELD_WIDGET_RELATION_CARD_LOAD_MORE_INCREMENT } from '@/page-layout/widgets/field/constants/FieldWidgetRelationCardLoadMoreIncrement';
import { generateFieldWidgetInstanceId } from '@/page-layout/widgets/field/utils/generateFieldWidgetInstanceId';
import { isFieldWidget } from '@/page-layout/widgets/field/utils/isFieldWidget';
import { useCurrentWidget } from '@/page-layout/widgets/hooks/useCurrentWidget';
import { RecordTableWidgetViewDraftInitEffect } from '@/page-layout/widgets/record-table/components/RecordTableWidgetViewDraftInitEffect';
import { useRecordTableWidgetViewFieldItems } from '@/page-layout/widgets/record-table/hooks/useRecordTableWidgetViewFieldItems';
import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';
import { SidePanelProvider } from '@/ui/layout/side-panel/contexts/SidePanelContext';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledLeftSideContainer = styled.div`
  align-items: center;
  display: flex;
  flex: 1;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
  overflow: hidden;
`;

const StyledFieldValueContainer = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  flex-shrink: 0;
  max-width: 40%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledShowMoreButtonContainer = styled.div`
  padding-top: ${themeCssVariables.spacing[2]};
`;

type FieldWidgetJunctionRelationTableProps = {
  fieldDefinition: FieldDefinition<FieldRelationMetadata>;
  relationValue: unknown;
  isInSidePanel: boolean;
  sourceObjectMetadataId: string;
};

export const FieldWidgetJunctionRelationTable = ({
  fieldDefinition,
  relationValue,
  isInSidePanel,
  sourceObjectMetadataId,
}: FieldWidgetJunctionRelationTableProps) => {
  const widget = useCurrentWidget();
  const targetRecord = useTargetRecord();
  const pageLayoutId = useAtomStateValue(currentPageLayoutIdState);
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();

  const [visibleItemsCount, setVisibleItemsCount] = useState(
    FIELD_WIDGET_RELATION_CARD_INITIAL_VISIBLE_ITEMS,
  );

  const viewId = isFieldWidget(widget) ? widget.configuration.viewId : undefined;

  const instanceId = generateFieldWidgetInstanceId({
    widgetId: widget.id,
    recordId: targetRecord.id,
    fieldName: fieldDefinition.metadata.fieldName,
    isInSidePanel,
  });

  const { objectMetadataItems } = useObjectMetadataItems();

  const junctionConfig = getJunctionConfig({
    settings: fieldDefinition.metadata.settings,
    relationObjectMetadataId: fieldDefinition.metadata.relationObjectMetadataId,
    sourceObjectMetadataId,
    objectMetadataItems,
  });

  const targetObjectMetadataItem = useMemo(() => {
    const targetObjectMetadataId =
      junctionConfig?.targetFields[0]?.relation?.targetObjectMetadata.id ??
      junctionConfig?.targetFields[0]?.morphRelations?.[0]?.targetObjectMetadata
        .id;

    return objectMetadataItems.find(
      (objectMetadataItem) =>
        objectMetadataItem.id === targetObjectMetadataId,
    );
  }, [junctionConfig, objectMetadataItems]);

  const { recordTableWidgetViewFieldItems } =
    useRecordTableWidgetViewFieldItems({
      viewId: viewId ?? '',
      widgetId: widget.id,
      pageLayoutId: pageLayoutId ?? '',
    });

  const visibleInlineFieldItems = useMemo(() => {
    if (!isDefined(targetObjectMetadataItem)) {
      return [];
    }

    return recordTableWidgetViewFieldItems.filter(
      (fieldItem) =>
        fieldItem.viewField.isVisible &&
        fieldItem.fieldMetadataItem.id !==
          targetObjectMetadataItem.labelIdentifierFieldMetadataId,
    );
  }, [recordTableWidgetViewFieldItems, targetObjectMetadataItem]);

  if (
    !isDefined(junctionConfig) ||
    !isDefined(targetObjectMetadataItem) ||
    !isDefined(viewId)
  ) {
    return null;
  }

  const junctionRecords = Array.isArray(relationValue) ? relationValue : [];

  const extractedRecords = extractTargetRecordsFromJunction({
    junctionRecords,
    targetFields: junctionConfig.targetFields,
    objectMetadataItems,
    includeRecord: true,
  });

  const targetRecordsWithMetadata = extractedRecords
    .map((extracted) => {
      const objectMetadata = objectMetadataItems.find(
        (item) => item.id === extracted.objectMetadataId,
      );

      if (!objectMetadata || !extracted.record) {
        return null;
      }

      return {
        record: extracted.record,
        objectNameSingular: objectMetadata.nameSingular,
      };
    })
    .filter(isDefined);

  if (targetRecordsWithMetadata.length === 0) {
    return null;
  }

  const visibleRecords = targetRecordsWithMetadata.slice(0, visibleItemsCount);
  const remainingCount = targetRecordsWithMetadata.length - visibleItemsCount;
  const hasMoreRecords = remainingCount > 0;

  const handleShowMore = () => {
    setVisibleItemsCount(
      (previousCount) =>
        previousCount + FIELD_WIDGET_RELATION_CARD_LOAD_MORE_INCREMENT,
    );
  };

  return (
    <SidePanelProvider value={{ isInSidePanel }}>
      <RecordTableWidgetViewDraftInitEffect
        widgetId={widget.id}
        viewId={viewId}
      />
      <RecordFieldsScopeContextProvider value={{ scopeInstanceId: instanceId }}>
        <RecordDetailRecordsListContainer>
          {visibleRecords.map((item) => (
            <Fragment key={item.record.id}>
              <RecordDetailRelationRecordsListItemEffect
                relationRecordId={item.record.id}
                relationObjectMetadataNameSingular={item.objectNameSingular}
              />
              <RecordDetailRecordsListItemContainer>
                <StyledLeftSideContainer
                  onClick={() => {
                    openRecordInSidePanel({
                      recordId: item.record.id,
                      objectNameSingular: item.objectNameSingular,
                    });
                  }}
                >
                  <RecordChip
                    record={item.record}
                    objectNameSingular={item.objectNameSingular}
                  />
                  {visibleInlineFieldItems.map((fieldItem, fieldIndex) => (
                    <StyledFieldValueContainer
                      key={fieldItem.fieldMetadataItem.id}
                    >
                      <FieldContextProvider
                        objectNameSingular={item.objectNameSingular}
                        objectRecordId={item.record.id}
                        fieldMetadataName={fieldItem.fieldMetadataItem.name}
                        fieldPosition={fieldIndex}
                        isLabelIdentifier={false}
                      >
                        <FieldDisplay />
                      </FieldContextProvider>
                    </StyledFieldValueContainer>
                  ))}
                </StyledLeftSideContainer>
              </RecordDetailRecordsListItemContainer>
            </Fragment>
          ))}
          {hasMoreRecords && (
            <StyledShowMoreButtonContainer>
              <FieldWidgetShowMoreButton
                remainingCount={remainingCount}
                onClick={handleShowMore}
              />
            </StyledShowMoreButtonContainer>
          )}
        </RecordDetailRecordsListContainer>
      </RecordFieldsScopeContextProvider>
    </SidePanelProvider>
  );
};
