import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type View } from '@/views/types/View';
import { ViewKey } from '@/views/types/ViewKey';
import { AppPath } from 'twenty-shared/types';
import { getAppPath, isDefined } from 'twenty-shared/utils';
import { type NavigationMenuItem } from '~/generated-metadata/graphql';

export const getObjectNavigationMenuItemComputedLink = (
  item: Pick<NavigationMenuItem, 'targetObjectMetadataId'>,
  objectMetadataItems: Pick<EnrichedObjectMetadataItem, 'id' | 'namePlural'>[],
  views: Pick<View, 'id' | 'objectMetadataId' | 'key'>[],
): string => {
  const objectMetadataItem = objectMetadataItems.find(
    (meta) => meta.id === item.targetObjectMetadataId,
  );
  if (!isDefined(objectMetadataItem)) {
    return '';
  }

  // Always navigate to the INDEX view when clicking a base object in the sidebar.
  // Using lastVisitedViewId here would carry over filters from a saved view
  // (e.g. a favourite) visited earlier, which is confusing — the user expects
  // the default "all records" state when clicking the object itself.
  const indexViewId = views.find(
    (view) =>
      view.objectMetadataId === objectMetadataItem.id &&
      view.key === ViewKey.INDEX,
  )?.id;

  return getAppPath(
    AppPath.RecordIndexPage,
    { objectNamePlural: objectMetadataItem.namePlural },
    isDefined(indexViewId) ? { viewId: indexViewId } : undefined,
  );
};
