import {
  buildDashboardSelectedRecordsForCommandMenu,
  evaluateDashboardLayoutCommandMenuItemAvailability,
  resolveDashboardPageLayoutIdForCommandMenu,
} from '@/command-menu-item/utils/enrichDashboardSelectedRecordsForCommandMenu';
import { ContextStorePageType } from 'twenty-shared/types';
import { EngineComponentKey } from '~/generated-metadata/graphql';

describe('enrichDashboardSelectedRecordsForCommandMenu', () => {
  it('should resolve dashboard page layout id from current page layout when record store is empty', () => {
    expect(
      resolveDashboardPageLayoutIdForCommandMenu({
        selectedRecords: [],
        currentPageLayoutId: 'layout-id',
        pageLayoutIdFromRecordQuery: null,
        objectNameSingular: 'dashboard',
      }),
    ).toBe('layout-id');
  });

  it('should synthesize selected record for dashboard command menu context', () => {
    expect(
      buildDashboardSelectedRecordsForCommandMenu({
        selectedRecords: [],
        selectedRecordIds: ['dashboard-id'],
        resolvedPageLayoutId: 'layout-id',
        objectNameSingular: 'dashboard',
      }),
    ).toEqual([
      {
        id: 'dashboard-id',
        pageLayoutId: 'layout-id',
        createdAt: '',
        updatedAt: '',
      },
    ]);
  });

  it('should show edit dashboard when page layout id is available on synthetic record', () => {
    expect(
      evaluateDashboardLayoutCommandMenuItemAvailability(
        EngineComponentKey.EDIT_DASHBOARD_LAYOUT,
        {
          pageType: ContextStorePageType.Record,
          isInSidePanel: false,
          isDashboardPageLayoutInEditMode: false,
          isLayoutCustomizationModeEnabled: false,
          favoriteRecordIds: [],
          isSelectAll: false,
          hasAnySoftDeleteFilterOnView: false,
          numberOfSelectedRecords: 1,
          objectPermissions: {
            objectMetadataId: 'dashboard-metadata-id',
            canReadObjectRecords: true,
            canUpdateObjectRecords: true,
            canSoftDeleteObjectRecords: true,
            canDestroyObjectRecords: false,
            restrictedFields: {},
            rowLevelPermissionPredicates: [],
            rowLevelPermissionPredicateGroups: [],
          },
          selectedRecords: [
            {
              id: 'dashboard-id',
              pageLayoutId: 'layout-id',
              createdAt: '',
              updatedAt: '',
            },
          ],
          featureFlags: {},
          permissionFlags: {},
          targetObjectReadPermissions: {},
          targetObjectWritePermissions: {},
          canImpersonate: false,
          canAccessFullAdminPanel: false,
          objectMetadataItem: { nameSingular: 'dashboard' },
          objectMetadataLabel: 'Dashboard',
        },
      ),
    ).toBe(true);
  });
});
