import { isDefined } from 'twenty-shared/utils';

import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { type FlatPageLayoutWidget } from 'src/engine/metadata-modules/flat-page-layout-widget/types/flat-page-layout-widget.type';

// Resolves a page layout widget when the client sends either the workspace row id
// or the universal identifier. Also scans by id when universalIdentifierById is
// missing or stale (maps must still contain the widget under byUniversalIdentifier).
export const findFlatPageLayoutWidgetByWidgetIdInMaps = ({
  widgetId,
  flatPageLayoutWidgetMaps,
}: {
  widgetId: string;
  flatPageLayoutWidgetMaps: FlatEntityMaps<FlatPageLayoutWidget>;
}): FlatPageLayoutWidget | undefined => {
  const byInternalIdLookup = findFlatEntityByIdInFlatEntityMaps({
    flatEntityId: widgetId,
    flatEntityMaps: flatPageLayoutWidgetMaps,
  });

  if (isDefined(byInternalIdLookup)) {
    return byInternalIdLookup;
  }

  const byUniversalIdentifierKey =
    flatPageLayoutWidgetMaps.byUniversalIdentifier[widgetId];

  if (isDefined(byUniversalIdentifierKey)) {
    return byUniversalIdentifierKey;
  }

  for (const candidate of Object.values(
    flatPageLayoutWidgetMaps.byUniversalIdentifier,
  )) {
    if (!isDefined(candidate)) {
      continue;
    }

    if (
      candidate.id === widgetId ||
      candidate.universalIdentifier === widgetId
    ) {
      return candidate;
    }
  }

  return undefined;
};
