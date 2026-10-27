import { ViewType, ViewVisibility } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

export const isViewVisibleToUser = (
  view: {
    type?: ViewType;
    visibility: ViewVisibility;
    createdByUserWorkspaceId?: string | null;
  },
  userWorkspaceId?: string,
): boolean => {
  // Views backing record-table and fields widgets are shared page layout
  // configuration, so they must reach every member whatever their stored
  // visibility, otherwise widget field settings only show to their author.
  if (
    view.type === ViewType.TABLE_WIDGET ||
    view.type === ViewType.FIELDS_WIDGET
  ) {
    return true;
  }

  if (view.visibility === ViewVisibility.WORKSPACE) {
    return true;
  }

  return (
    view.visibility === ViewVisibility.UNLISTED &&
    isDefined(userWorkspaceId) &&
    view.createdByUserWorkspaceId === userWorkspaceId
  );
};
