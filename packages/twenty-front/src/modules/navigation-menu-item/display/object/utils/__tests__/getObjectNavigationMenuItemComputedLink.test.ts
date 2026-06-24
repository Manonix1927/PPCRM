import { getObjectNavigationMenuItemComputedLink } from '@/navigation-menu-item/display/object/utils/getObjectNavigationMenuItemComputedLink';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type View } from '@/views/types/View';
import { ViewKey } from '~/generated-metadata/graphql';

const mockObjectMetadataItems: Pick<
  EnrichedObjectMetadataItem,
  'id' | 'namePlural'
>[] = [
  {
    id: 'metadata-1',
    namePlural: 'people',
  },
];

const mockViews: Pick<View, 'id' | 'objectMetadataId' | 'key'>[] = [
  { id: 'view-index', objectMetadataId: 'metadata-1', key: ViewKey.INDEX },
];

describe('getObjectNavigationMenuItemComputedLink', () => {
  it('should always link to the index view', () => {
    const result = getObjectNavigationMenuItemComputedLink(
      { targetObjectMetadataId: 'metadata-1' },
      mockObjectMetadataItems,
      mockViews,
    );

    expect(result).toBe('/objects/people?viewId=view-index');
  });

  it('should link to the bare object path when no index view exists', () => {
    const result = getObjectNavigationMenuItemComputedLink(
      { targetObjectMetadataId: 'metadata-1' },
      mockObjectMetadataItems,
      [],
    );

    expect(result).toBe('/objects/people');
  });

  it('should return an empty string when the target object metadata is not found', () => {
    const result = getObjectNavigationMenuItemComputedLink(
      { targetObjectMetadataId: 'non-existent-metadata' },
      mockObjectMetadataItems,
      mockViews,
    );

    expect(result).toBe('');
  });
});
