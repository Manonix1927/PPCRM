import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { useRecordTableWidgetFieldCallbacks } from '@/page-layout/widgets/record-table/hooks/useRecordTableWidgetFieldCallbacks';
import { useRecordTableWidgetViewFieldItems } from '@/page-layout/widgets/record-table/hooks/useRecordTableWidgetViewFieldItems';
import { useReorderRecordTableWidgetFields } from '@/page-layout/widgets/record-table/hooks/useReorderRecordTableWidgetFields';
import { useToggleRecordTableWidgetFieldVisibility } from '@/page-layout/widgets/record-table/hooks/useToggleRecordTableWidgetFieldVisibility';
import { filterFieldsForRecordTableViewCreation } from '@/page-layout/widgets/record-table/utils/filterFieldsForRecordTableViewCreation';
import { DraggableItem } from '@/ui/layout/draggable-list/components/DraggableItem';
import { DraggableList } from '@/ui/layout/draggable-list/components/DraggableList';
import { useViewById } from '@/views/hooks/useViewById';
import { type DropResult } from '@hello-pangea/dnd';
import { styled } from '@linaria/react';
import { useMemo } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { IconEye, IconEyeOff, useIcons } from 'twenty-ui-deprecated/display';
import { MenuItemDraggable } from 'twenty-ui-deprecated/navigation';
import { themeCssVariables } from 'twenty-ui-deprecated/theme-constants';
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

  // Fields added to the object after this widget view was created are not yet
  // part of the view, so they appear in neither the visible nor the hidden
  // list. Surface them here as available-to-add so they can be selected.
  const availableFieldsToAdd = useMemo(() => {
    if (!isDefined(targetObjectMetadataItem)) {
      return [];
    }

    const existingFieldMetadataIds = new Set(
      recordTableWidgetViewFieldItems.map(
        (item) => item.fieldMetadataItem.id,
      ),
    );

    return targetObjectMetadataItem.fields
      .filter(filterFieldsForRecordTableViewCreation)
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

  const handleDragEnd = (result: DropResult) => {
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
      <StyledSectionLabel>Visible</StyledSectionLabel>
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
                    <MenuItemDraggable
                      LeftIcon={getIcon(fieldItem.fieldMetadataItem.icon)}
                      iconButtons={[
                        {
                          Icon: IconEyeOff,
                          onClick: () => {
                            toggleRecordTableWidgetFieldVisibility(
                              fieldItem.viewField.id,
                              false,
                            );
                          },
                        },
                      ]}
                      text={fieldItem.fieldMetadataItem.label}
                      gripMode="always"
                    />
                  }
                />
              ))}
            </>
          }
        />
      )}
      {(hiddenFieldItems.length > 0 || availableFieldsToAdd.length > 0) && (
        <>
          <StyledSectionLabel>Hidden</StyledSectionLabel>
          {hiddenFieldItems.map((fieldItem) => (
            <MenuItemDraggable
              key={fieldItem.viewField.id}
              LeftIcon={getIcon(fieldItem.fieldMetadataItem.icon)}
              iconButtons={[
                {
                  Icon: IconEye,
                  onClick: () => {
                    toggleRecordTableWidgetFieldVisibility(
                      fieldItem.viewField.id,
                      true,
                    );
                  },
                },
              ]}
              text={fieldItem.fieldMetadataItem.label}
              accent="placeholder"
              isDragDisabled
            />
          ))}
          {availableFieldsToAdd.map((fieldMetadataItem) => (
            <MenuItemDraggable
              key={fieldMetadataItem.id}
              LeftIcon={getIcon(fieldMetadataItem.icon)}
              iconButtons={[
                {
                  Icon: IconEye,
                  onClick: () => {
                    handleAddField(fieldMetadataItem.id);
                  },
                },
              ]}
              text={fieldMetadataItem.label}
              accent="placeholder"
              isDragDisabled
            />
          ))}
        </>
      )}
    </StyledFieldListContainer>
  );
};
