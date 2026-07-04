import { isDefined } from 'twenty-shared/utils';

import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { type FlatPageLayoutWidget } from 'src/engine/metadata-modules/flat-page-layout-widget/types/flat-page-layout-widget.type';
import { type FlatViewMaps } from 'src/engine/metadata-modules/flat-view/types/flat-view-maps.type';
import { type PageLayoutWidgetEntity } from 'src/engine/metadata-modules/page-layout-widget/entities/page-layout-widget.entity';
import { WidgetConfigurationType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-configuration-type.type';
import { WidgetType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-type.enum';

export const resolveViewIdStringUsingFlatViewMaps = (
  rawViewId: string,
  flatViewMaps: FlatViewMaps,
): string => {
  const viewFromUniversalKey =
    flatViewMaps.byUniversalIdentifier[rawViewId];

  if (isDefined(viewFromUniversalKey)) {
    return viewFromUniversalKey.id;
  }

  const viewFromInternalIdLookup = findFlatEntityByIdInFlatEntityMaps({
    flatEntityId: rawViewId,
    flatEntityMaps: flatViewMaps,
  });

  if (isDefined(viewFromInternalIdLookup)) {
    return viewFromInternalIdLookup.id;
  }

  return rawViewId;
};

export const isFlatPageLayoutWidgetUsableAsFieldsWidget = (
  widget: FlatPageLayoutWidget,
): boolean => {
  if (widget.type === WidgetType.FIELDS) {
    return true;
  }

  if (!isDefined(widget.configuration)) {
    return false;
  }

  return (
    widget.configuration.configurationType === WidgetConfigurationType.FIELDS
  );
};

export const resolveFieldsWidgetViewIdForUpsert = ({
  widget,
  flatViewMaps,
}: {
  widget: FlatPageLayoutWidget;
  flatViewMaps: FlatViewMaps;
}): string | undefined => {
  const configuration = widget.configuration;

  if (
    isDefined(configuration) &&
    configuration.configurationType === WidgetConfigurationType.FIELDS
  ) {
    const viewId = configuration.viewId;

    return isDefined(viewId)
      ? resolveViewIdStringUsingFlatViewMaps(viewId, flatViewMaps)
      : undefined;
  }

  if (widget.type === WidgetType.FIELDS && isDefined(configuration)) {
    const maybeViewId = (configuration as { viewId?: string | null }).viewId;

    if (isDefined(maybeViewId)) {
      return resolveViewIdStringUsingFlatViewMaps(
        maybeViewId,
        flatViewMaps,
      );
    }
  }

  const universalConfiguration = widget.universalConfiguration;

  if (
    !isDefined(universalConfiguration) ||
    universalConfiguration.configurationType !==
      WidgetConfigurationType.FIELDS ||
    !isDefined(universalConfiguration.viewUniversalIdentifier)
  ) {
    return undefined;
  }

  return resolveViewIdStringUsingFlatViewMaps(
    universalConfiguration.viewUniversalIdentifier,
    flatViewMaps,
  );
};

export const resolveFieldsWidgetViewIdFromPageLayoutWidgetEntity = ({
  entity,
  flatViewMaps,
}: {
  entity: PageLayoutWidgetEntity;
  flatViewMaps: FlatViewMaps;
}): string | undefined => {
  if (entity.type !== WidgetType.FIELDS) {
    return undefined;
  }

  const configuration = entity.configuration;

  if (
    isDefined(configuration) &&
    configuration.configurationType === WidgetConfigurationType.FIELDS
  ) {
    const viewId = configuration.viewId;

    return isDefined(viewId)
      ? resolveViewIdStringUsingFlatViewMaps(viewId, flatViewMaps)
      : undefined;
  }

  if (isDefined(configuration)) {
    const maybeViewId = (configuration as { viewId?: string | null }).viewId;

    if (isDefined(maybeViewId)) {
      return resolveViewIdStringUsingFlatViewMaps(
        maybeViewId,
        flatViewMaps,
      );
    }
  }

  return undefined;
};
