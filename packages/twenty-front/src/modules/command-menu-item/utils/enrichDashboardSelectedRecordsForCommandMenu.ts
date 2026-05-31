import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

export const getDashboardPageLayoutIdForCommandMenu = ({
  selectedRecords,
  currentPageLayoutId,
  objectNameSingular,
}: {
  selectedRecords: ObjectRecord[];
  currentPageLayoutId: string | null;
  objectNameSingular: string | undefined;
}): string | null => {
  if (objectNameSingular !== CoreObjectNameSingular.Dashboard) {
    return null;
  }

  const pageLayoutIdFromRecord = selectedRecords[0]?.pageLayoutId;

  if (isDefined(pageLayoutIdFromRecord)) {
    return pageLayoutIdFromRecord;
  }

  return currentPageLayoutId;
};

export const enrichDashboardSelectedRecordsForCommandMenu = ({
  selectedRecords,
  resolvedPageLayoutId,
  objectNameSingular,
}: {
  selectedRecords: ObjectRecord[];
  resolvedPageLayoutId: string | null;
  objectNameSingular: string | undefined;
}): ObjectRecord[] => {
  if (
    objectNameSingular !== CoreObjectNameSingular.Dashboard ||
    !isDefined(resolvedPageLayoutId) ||
    selectedRecords.length === 0
  ) {
    return selectedRecords;
  }

  return selectedRecords.map((record) =>
    isDefined(record.pageLayoutId)
      ? record
      : { ...record, pageLayoutId: resolvedPageLayoutId },
  );
};
