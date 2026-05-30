import { useFieldMetadataItemById } from '@/object-metadata/hooks/useFieldMetadataItemById';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { hasJunctionConfig } from '@/object-record/record-field/ui/utils/junction/hasJunctionConfig';
import { getJunctionRelationTargetObjectMetadataId } from '@/page-layout/widgets/field/utils/getJunctionRelationTargetObjectMetadataId';
import { getFieldWidgetAvailableDisplayModes } from '@/page-layout/widgets/field/utils/getFieldWidgetDisplayModeConfig';
import { useAddDraftViewForFieldRelationTableWidget } from '@/page-layout/widgets/record-table/hooks/useAddDraftViewForFieldRelationTableWidget';
import { usePageLayoutIdFromContextStore } from '@/side-panel/pages/page-layout/hooks/usePageLayoutIdFromContextStore';
import { useUpdateCurrentWidgetConfig } from '@/side-panel/pages/page-layout/hooks/useUpdateCurrentWidgetConfig';
import { useWidgetInEditMode } from '@/side-panel/pages/page-layout/hooks/useWidgetInEditMode';
import { DropdownMenuItemsContainer } from '@/ui/layout/dropdown/components/DropdownMenuItemsContainer';
import { DropdownComponentInstanceContext } from '@/ui/layout/dropdown/contexts/DropdownComponentInstanceContext';
import { useCloseDropdown } from '@/ui/layout/dropdown/hooks/useCloseDropdown';
import { SelectableList } from '@/ui/layout/selectable-list/components/SelectableList';
import { SelectableListItem } from '@/ui/layout/selectable-list/components/SelectableListItem';
import { selectedItemIdComponentState } from '@/ui/layout/selectable-list/states/selectedItemIdComponentState';
import { useAvailableComponentInstanceIdOrThrow } from '@/ui/utilities/state/component-state/hooks/useAvailableComponentInstanceIdOrThrow';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';
import { isDefined } from 'twenty-shared/utils';
import {
  type IconComponent,
  IconFileText,
  IconLayoutKanban,
  IconListDetails,
  IconTable,
} from 'twenty-ui/display';
import { MenuItemSelect } from 'twenty-ui/navigation';
import {
  FieldDisplayMode,
  type FieldConfiguration,
} from '~/generated-metadata/graphql';

const DISPLAY_MODE_ICONS: Record<FieldDisplayMode, IconComponent> = {
  [FieldDisplayMode.FIELD]: IconListDetails,
  [FieldDisplayMode.CARD]: IconLayoutKanban,
  [FieldDisplayMode.EDITOR]: IconFileText,
  [FieldDisplayMode.VIEW]: IconListDetails,
  [FieldDisplayMode.TABLE]: IconTable,
};

export const FieldWidgetLayoutDropdownContent = () => {
  const { t } = useLingui();

  const { pageLayoutId } = usePageLayoutIdFromContextStore();

  const { widgetInEditMode } = useWidgetInEditMode(pageLayoutId);

  const fieldConfiguration = widgetInEditMode?.configuration as
    | FieldConfiguration
    | undefined;

  const currentDisplayMode = fieldConfiguration?.fieldDisplayMode;
  const currentFieldMetadataId = fieldConfiguration?.fieldMetadataId;

  const { fieldMetadataItem } = useFieldMetadataItemById(
    currentFieldMetadataId ?? '',
  );

  const { objectMetadataItems } = useObjectMetadataItems();

  const layoutOptions = useMemo(
    () =>
      fieldMetadataItem
        ? getFieldWidgetAvailableDisplayModes(
            fieldMetadataItem.type,
            fieldMetadataItem.relation?.type,
          )
        : [FieldDisplayMode.FIELD],
    [fieldMetadataItem],
  );

  const dropdownId = useAvailableComponentInstanceIdOrThrow(
    DropdownComponentInstanceContext,
  );

  const selectedItemId = useAtomComponentStateValue(
    selectedItemIdComponentState,
    dropdownId,
  );

  const { updateCurrentWidgetConfig } =
    useUpdateCurrentWidgetConfig(pageLayoutId);

  const { addDraftViewForFieldRelationTableWidget } =
    useAddDraftViewForFieldRelationTableWidget(pageLayoutId);

  const { closeDropdown } = useCloseDropdown();

  const handleSelectLayout = (fieldDisplayMode: FieldDisplayMode) => {
    const isJunctionRelation = hasJunctionConfig(fieldMetadataItem?.settings);

    const junctionTargetObjectMetadataId = isDefined(fieldMetadataItem)
      ? getJunctionRelationTargetObjectMetadataId({
          settings: fieldMetadataItem.settings,
          relationObjectMetadataId:
            fieldMetadataItem.relation?.targetObjectMetadata.id ?? '',
          sourceObjectMetadataId: fieldMetadataItem.objectMetadataId ?? '',
          objectMetadataItems,
        })
      : undefined;

    const targetObjectMetadataId =
      junctionTargetObjectMetadataId ??
      fieldMetadataItem?.relation?.targetObjectMetadata.id;

    const inverseFieldMetadataId =
      fieldMetadataItem?.relation?.targetFieldMetadata.id;

    if (
      fieldDisplayMode === FieldDisplayMode.TABLE &&
      !isDefined(fieldConfiguration?.viewId) &&
      isDefined(widgetInEditMode) &&
      isDefined(targetObjectMetadataId) &&
      (isJunctionRelation || isDefined(inverseFieldMetadataId))
    ) {
      const viewId = addDraftViewForFieldRelationTableWidget({
        widgetId: widgetInEditMode.id,
        targetObjectMetadataId,
        inverseFieldMetadataId: inverseFieldMetadataId ?? '',
        skipRelationFilter: isJunctionRelation,
      });

      updateCurrentWidgetConfig({
        configToUpdate: {
          fieldDisplayMode,
          viewId,
        },
      });
      closeDropdown();
      return;
    }

    updateCurrentWidgetConfig({
      configToUpdate: {
        fieldDisplayMode,
      },
    });
    closeDropdown();
  };

  const layoutLabels: Record<string, string> = {
    [FieldDisplayMode.FIELD]: t`Field`,
    [FieldDisplayMode.CARD]: t`Card`,
    [FieldDisplayMode.EDITOR]: t`Editor`,
    [FieldDisplayMode.TABLE]: t`Table`,
  };

  return (
    <DropdownMenuItemsContainer>
      <SelectableList
        selectableListInstanceId={dropdownId}
        focusId={dropdownId}
        selectableItemIdArray={layoutOptions}
      >
        {layoutOptions.map((displayMode) => (
          <SelectableListItem
            key={displayMode}
            itemId={displayMode}
            onEnter={() => {
              handleSelectLayout(displayMode);
            }}
          >
            <MenuItemSelect
              text={layoutLabels[displayMode]}
              selected={currentDisplayMode === displayMode}
              focused={selectedItemId === displayMode}
              LeftIcon={DISPLAY_MODE_ICONS[displayMode]}
              onClick={() => {
                handleSelectLayout(displayMode);
              }}
            />
          </SelectableListItem>
        ))}
      </SelectableList>
    </DropdownMenuItemsContainer>
  );
};
