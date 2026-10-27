import { DraggableListRow } from '@/ui/layout/draggable-list/components/DraggableListRow';
import { ApplicationStackIcon } from '@/applications/components/ApplicationStackIcon';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { useRecordTableWidgetFieldCallbacks } from '@/page-layout/widgets/record-table/hooks/useRecordTableWidgetFieldCallbacks';
import { useRecordTableWidgetViewFieldItems } from '@/page-layout/widgets/record-table/hooks/useRecordTableWidgetViewFieldItems';
import { useReorderRecordTableWidgetFields } from '@/page-layout/widgets/record-table/hooks/useReorderRecordTableWidgetFields';
import { useToggleRecordTableWidgetFieldVisibility } from '@/page-layout/widgets/record-table/hooks/useToggleRecordTableWidgetFieldVisibility';
import { filterFieldsForRecordTableViewCreation } from '@/page-layout/widgets/record-table/utils/filterFieldsForRecordTableViewCreation';
import { DraggableItem } from '@/ui/layout/draggable-list/components/DraggableItem';
import { DraggableList } from '@/ui/layout/draggable-list/components/DraggableList';
import { useViewById } from '@/views/hooks/useViewById';
import { type DraggableListDropResult } from '@/ui/layout/draggable-list/types/DraggableListDropResult';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { useMemo } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconEye, IconEyeOff, useIcons } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme';
import { v4 } from 'uuid';

const StyledFieldListContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow-y: auto;
`;

const StyledSectionLabel = styled.div`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  text-transform: uppercase;
`;

type RecordTableSettingsFieldVisibilityProps = {
  viewId: string;
  widgetId: string;
  pageLayoutId: string;
};

export const RecordTableSettingsFieldVisibility = ({
  viewId,
  widgetId,
  pageLayoutId,
}: RecordTableSettingsFieldVisibilityProps) => {
  const { recordTableWidgetViewFieldItems } =
    useRecordTableWidgetViewFieldItems({ viewId, widgetId, pageLayoutId });

  const { toggleRecordTableWidgetFieldVisibility } =
    useToggleRecordTableWidgetFieldVisibility({ pageLayoutId, widgetId });

  const { reorderRecordTableWidgetFields } = useReorderRecordTableWidgetFields({
    pageLayoutId,
    widgetId,
  });

  const { handleFieldCreated } = useRecordTableWidgetFieldCallbacks({
    pageLayoutId,
    widgetId,
    viewId,
  });

  const { view } = useViewById(viewId);
  const { objectMetadataItems } = useObjectMetadataItems();

  const targetObjectMetadataItem = useMemo(
    () =>
      objectMetadataItems.find(
        (objectMetadataItem) =>
          objectMetadataItem.id === view?.objectMetadataId,
      ),
    [objectMetadataItems, view?.objectMetadataId],
  );

  const { getIcon } = useIcons();

  const visibleFieldItems = useMemo(
    () =>
      recordTableWidgetViewFieldItems.filter(
        (item) => item.viewField.isVisible,
      ),
    [recordTableWidgetViewFieldItems],
  );

  const hiddenFieldItems = useMemo(
    () =>
      recordTableWidgetViewFieldItems.filter(
        (item) => !item.viewField.isVisible,
      ),
    [recordTableWidgetViewFieldItems],
  );

  // Fields added to the object after this widget view was created are in
  // neither list, so surface them as hidden fields that can be shown
  const availableFieldsToAdd = useMemo(() => {
    if (!isDefined(targetObjectMetadataItem)) {
      return [];
    }

    const existingFieldMetadataIds = new Set(
      recordTableWidgetViewFieldItems.map((item) => item.fieldMetadataItem.id),
    );

    return targetObjectMetadataItem.fields
      .filter((field) =>
        filterFieldsForRecordTableViewCreation(
          field,
          targetObjectMetadataItem.labelIdentifierFieldMetadataId,
        ),
      )
      .filter((field) => !existingFieldMetadataIds.has(field.id))
      .toSorted((a, b) => a.label.localeCompare(b.label));
  }, [targetObjectMetadataItem, recordTableWidgetViewFieldItems]);

  const handleAddField = (fieldMetadataId: string) => {
    const lastPosition = recordTableWidgetViewFieldItems.reduce(
      (maxPosition, item) => Math.max(maxPosition, item.viewField.position),
      -1,
    );

    handleFieldCreated({
      id: v4(),
      fieldMetadataItemId: fieldMetadataId,
      size: 100,
      isVisible: true,
      position: lastPosition + 1,
    });
  };

  const handleDragEnd = (result: DraggableListDropResult) => {
    const { source, destination } = result;

    if (!destination) {
      return;
    }

    reorderRecordTableWidgetFields(
      source.index,
      destination.index,
      visibleFieldItems,
    );
  };

  return (
    <StyledFieldListContainer>
      <StyledSectionLabel>{t`Visible`}</StyledSectionLabel>
      {visibleFieldItems.length > 0 && (
        <DraggableList
          onDragEnd={handleDragEnd}
          draggableItems={
            <>
              {visibleFieldItems.map((fieldItem, index) => (
                <DraggableItem
                  key={fieldItem.viewField.id}
                  draggableId={fieldItem.viewField.id}
                  index={index}
                  itemComponent={
                    <DraggableListRow
                      startIcon={
                        <ApplicationStackIcon
                          Icon={getIcon(fieldItem.fieldMetadataItem.icon)}
                          applicationId={
                            fieldItem.fieldMetadataItem.applicationId
                          }
                        />
                      }
                      actions={
                        <LightIconButton
                          aria-label={t`Hide field`}
                          onClick={() => {
                            toggleRecordTableWidgetFieldVisibility(
                              fieldItem.viewField.id,
                              false,
                            );
                          }}
                        >
                          <IconEyeOff />
                        </LightIconButton>
                      }
                      dragHandleVisibility="always"
                    >
                      {fieldItem.fieldMetadataItem.label}
                    </DraggableListRow>
                  }
                />
              ))}
            </>
          }
        />
      )}
      {(hiddenFieldItems.length > 0 || availableFieldsToAdd.length > 0) && (
        <>
          <StyledSectionLabel>{t`Hidden`}</StyledSectionLabel>
          {hiddenFieldItems.map((fieldItem) => (
            <DraggableListRow
              key={fieldItem.viewField.id}
              startIcon={
                <ApplicationStackIcon
                  Icon={getIcon(fieldItem.fieldMetadataItem.icon)}
                  applicationId={fieldItem.fieldMetadataItem.applicationId}
                />
              }
              actions={
                <LightIconButton
                  aria-label={t`Show field`}
                  onClick={() => {
                    toggleRecordTableWidgetFieldVisibility(
                      fieldItem.viewField.id,
                      true,
                    );
                  }}
                >
                  <IconEye />
                </LightIconButton>
              }
              isMuted
              isDragDisabled
            >
              {fieldItem.fieldMetadataItem.label}
            </DraggableListRow>
          ))}
          {availableFieldsToAdd.map((fieldMetadataItem) => (
            <DraggableListRow
              key={fieldMetadataItem.id}
              startIcon={
                <ApplicationStackIcon
                  Icon={getIcon(fieldMetadataItem.icon)}
                  applicationId={fieldMetadataItem.applicationId}
                />
              }
              actions={
                <LightIconButton
                  aria-label={t`Show field`}
                  onClick={() => {
                    handleAddField(fieldMetadataItem.id);
                  }}
                >
                  <IconEye />
                </LightIconButton>
              }
              isMuted
              isDragDisabled
            >
              {fieldMetadataItem.label}
            </DraggableListRow>
          ))}
        </>
      )}
    </StyledFieldListContainer>
  );
};
