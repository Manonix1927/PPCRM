import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type View } from '@/views/types/View';
import {
  NavigationMenuItemType,
  ViewKey,
  type NavigationMenuItem,
} from '~/generated-metadata/graphql';

import { getNavigationMenuItemComputedLink } from '@/navigation-menu-item/display/utils/getNavigationMenuItemComputedLink';

const objectMetadataItems = [
  { id: 'obj-1', namePlural: 'people' },
  { id: 'obj-2', namePlural: 'companies' },
] as EnrichedObjectMetadataItem[];

const views: Pick<View, 'id' | 'objectMetadataId' | 'key'>[] = [
  { id: 'view-index', objectMetadataId: 'obj-1', key: ViewKey.INDEX },
];

const objectItem: NavigationMenuItem = {
  id: 'nav-1',
  type: NavigationMenuItemType.OBJECT,
  targetObjectMetadataId: 'obj-1',
  position: 0,
  createdAt: '',
  updatedAt: '',
};

describe('getNavigationMenuItemComputedLink', () => {
  // Clicking a base object in the sidebar always goes to the INDEX view,
  // regardless of any previously visited views. This prevents saved-view
  // filters from leaking back when navigating via the main sidebar object.
  it('should always link an object item to its index view', () => {
    const link = getNavigationMenuItemComputedLink({
      item: objectItem,
      objectMetadataItems,
      views,
    });

    expect(link).toBe('/objects/people?viewId=view-index');
  });

  it('should fall back gracefully when no index view exists', () => {
    const link = getNavigationMenuItemComputedLink({
      item: objectItem,
      objectMetadataItems,
      views: [],
    });

    expect(link).toBe('/objects/people');
  });
});
