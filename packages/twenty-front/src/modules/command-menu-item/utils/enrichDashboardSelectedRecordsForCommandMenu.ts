import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import {
  ContextStorePageType,
  CoreObjectNameSingular,
  type CommandMenuContextApi,
} from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { EngineComponentKey } from '~/generated-metadata/graphql';

const DASHBOARD_LAYOUT_COMMAND_ENGINE_COMPONENT_KEYS = new Set([
  EngineComponentKey.EDIT_DASHBOARD_LAYOUT,
  EngineComponentKey.SAVE_DASHBOARD_LAYOUT,
  EngineComponentKey.CANCEL_DASHBOARD_LAYOUT,
]);

export const isDashboardLayoutCommandMenuItem = (
  engineComponentKey: EngineComponentKey | null | undefined,
): boolean =>
  isDefined(engineComponentKey) &&
  DASHBOARD_LAYOUT_COMMAND_ENGINE_COMPONENT_KEYS.has(engineComponentKey);

export const resolveDashboardPageLayoutIdForCommandMenu = ({
  selectedRecords,
  currentPageLayoutId,
  pageLayoutIdFromRecordQuery,
  objectNameSingular,
}: {
  selectedRecords: ObjectRecord[];
  currentPageLayoutId: string | null;
  pageLayoutIdFromRecordQuery: string | null | undefined;
  objectNameSingular: string | undefined;
}): string | null => {
  if (objectNameSingular !== CoreObjectNameSingular.Dashboard) {
    return null;
  }

  const pageLayoutIdFromRecord = selectedRecords[0]?.pageLayoutId;

  if (isDefined(pageLayoutIdFromRecord)) {
    return pageLayoutIdFromRecord;
  }

  if (isDefined(pageLayoutIdFromRecordQuery)) {
    return pageLayoutIdFromRecordQuery;
  }

  return currentPageLayoutId;
};

export const buildDashboardSelectedRecordsForCommandMenu = ({
  selectedRecords,
  selectedRecordIds,
  resolvedPageLayoutId,
  objectNameSingular,
}: {
  selectedRecords: ObjectRecord[];
  selectedRecordIds: string[];
  resolvedPageLayoutId: string | null;
  objectNameSingular: string | undefined;
}): ObjectRecord[] => {
  if (
    objectNameSingular !== CoreObjectNameSingular.Dashboard ||
    !isDefined(resolvedPageLayoutId)
  ) {
    return selectedRecords;
  }

  if (selectedRecords.length === 0 && selectedRecordIds.length > 0) {
    return [
      {
        id: selectedRecordIds[0],
        pageLayoutId: resolvedPageLayoutId,
        createdAt: '',
        updatedAt: '',
      },
    ];
  }

  return selectedRecords.map((record) =>
    isDefined(record.pageLayoutId)
      ? record
      : { ...record, pageLayoutId: resolvedPageLayoutId },
  );
};

export const getResolvedDashboardPageLayoutIdForRecord = (
  selectedRecord: ObjectRecord | undefined,
  currentPageLayoutId: string | null,
): string | undefined => {
  if (isDefined(selectedRecord?.pageLayoutId)) {
    return selectedRecord.pageLayoutId;
  }

  return currentPageLayoutId ?? undefined;
};

export const evaluateDashboardLayoutCommandMenuItemAvailability = (
  engineComponentKey: EngineComponentKey,
  commandMenuContextApi: CommandMenuContextApi,
): boolean => {
  if (commandMenuContextApi.pageType !== ContextStorePageType.Record) {
    return false;
  }

  if (
    commandMenuContextApi.objectMetadataItem.nameSingular !==
    CoreObjectNameSingular.Dashboard
  ) {
    return false;
  }

  if (!commandMenuContextApi.objectPermissions.canUpdateObjectRecords) {
    return false;
  }

  if (commandMenuContextApi.isLayoutCustomizationModeEnabled) {
    return false;
  }

  const pageLayoutId =
    commandMenuContextApi.selectedRecords[0]?.pageLayoutId ?? null;

  if (!isDefined(pageLayoutId)) {
    return false;
  }

  const hasDeletedSelectedRecord = commandMenuContextApi.selectedRecords.some(
    (record) => isDefined(record.deletedAt),
  );

  if (hasDeletedSelectedRecord) {
    return false;
  }

  switch (engineComponentKey) {
    case EngineComponentKey.EDIT_DASHBOARD_LAYOUT:
      return !commandMenuContextApi.isDashboardPageLayoutInEditMode;
    case EngineComponentKey.SAVE_DASHBOARD_LAYOUT:
    case EngineComponentKey.CANCEL_DASHBOARD_LAYOUT:
      return commandMenuContextApi.isDashboardPageLayoutInEditMode;
    default:
      return false;
  }
};
