import { Command } from 'nest-commander';
import { RelationType, ViewFilterOperand } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { ProvisionedWorkspaceCommandRunner } from 'src/database/commands/command-runners/provisioned-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { ViewFilterService } from 'src/engine/metadata-modules/view-filter/services/view-filter.service';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';

// The fork used to save junction relation table widgets with an unfiltered
// view and scope the rows in its own table component. Upstream's table relies
// on a "current record" filter stored in the view, so without it those
// widgets list every target record. This adds the filter upstream would have
// created through the junction.
@RegisteredWorkspaceCommand('2.52.0', 1793100000000)
@Command({
  name: 'upgrade:2-52:scope-junction-field-widget-views',
  description:
    'Add the current-record filter to junction relation table widget views saved without one',
})
export class ScopeJunctionFieldWidgetViewsCommand extends ProvisionedWorkspaceCommandRunner {
  constructor(
    protected readonly workspaceIteratorService: WorkspaceIteratorService,
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly viewFilterService: ViewFilterService,
  ) {
    super(workspaceIteratorService);
  }

  override async runOnWorkspace({
    workspaceId,
    options,
  }: RunOnWorkspaceArgs): Promise<void> {
    const isDryRun = options.dryRun ?? false;

    const {
      flatFieldMetadataMaps,
      flatPageLayoutWidgetMaps,
      flatViewMaps,
      flatViewFilterMaps,
    } = await this.workspaceCacheService.getOrRecompute(workspaceId, [
      'flatFieldMetadataMaps',
      'flatPageLayoutWidgetMaps',
      'flatViewMaps',
      'flatViewFilterMaps',
    ]);

    const flatFieldMetadatas = Object.values(
      flatFieldMetadataMaps.byUniversalIdentifier,
    ).filter(isDefined);
    const findFieldById = (fieldMetadataId: string | null | undefined) =>
      flatFieldMetadatas.find(({ id }) => id === fieldMetadataId);

    const flatViews = Object.values(flatViewMaps.byUniversalIdentifier).filter(
      isDefined,
    );
    const flatViewFilters = Object.values(
      flatViewFilterMaps.byUniversalIdentifier,
    ).filter(
      (flatViewFilter) =>
        isDefined(flatViewFilter) && !isDefined(flatViewFilter.deletedAt),
    );

    for (const flatWidget of Object.values(
      flatPageLayoutWidgetMaps.byUniversalIdentifier,
    )) {
      if (!isDefined(flatWidget) || isDefined(flatWidget.deletedAt)) {
        continue;
      }

      const configuration = flatWidget.configuration as {
        configurationType?: string;
        fieldDisplayMode?: string;
        fieldMetadataId?: string;
        viewId?: string;
        nestedRelationFieldMetadataId?: string;
      } | null;

      if (
        configuration?.configurationType !== 'FIELD' ||
        configuration.fieldDisplayMode !== 'TABLE' ||
        !isDefined(configuration.viewId) ||
        isDefined(configuration.nestedRelationFieldMetadataId)
      ) {
        continue;
      }

      const sourceField = findFieldById(configuration.fieldMetadataId);
      const settings = sourceField?.settings as {
        relationType?: RelationType;
        junctionTargetFieldId?: string;
      } | null;

      if (
        !isDefined(sourceField) ||
        settings?.relationType !== RelationType.ONE_TO_MANY ||
        !isDefined(settings.junctionTargetFieldId)
      ) {
        continue;
      }

      // junction -> target, its inverse lives on the target object
      const junctionTargetField = findFieldById(settings.junctionTargetFieldId);
      // junction -> source, the inverse of the widget's field
      const junctionSourceField = findFieldById(
        sourceField.relationTargetFieldMetadataId,
      );
      const inverseFieldMetadataId =
        junctionTargetField?.relationTargetFieldMetadataId;

      const view = flatViews.find(({ id }) => id === configuration.viewId);

      if (
        !isDefined(view) ||
        isDefined(view.deletedAt) ||
        !isDefined(inverseFieldMetadataId) ||
        !isDefined(junctionSourceField) ||
        view.objectMetadataId !==
          junctionTargetField?.relationTargetObjectMetadataId
      ) {
        continue;
      }

      const isAlreadyScoped = flatViewFilters.some(
        (flatViewFilter) =>
          flatViewFilter?.viewId === view.id &&
          flatViewFilter.fieldMetadataId === inverseFieldMetadataId,
      );

      if (isAlreadyScoped) {
        continue;
      }

      if (isDryRun) {
        this.logger.log(
          `[DRY RUN] Would scope view ${view.id} of widget ${flatWidget.id} to the current record`,
        );

        continue;
      }

      await this.viewFilterService.createOne({
        workspaceId,
        createViewFilterInput: {
          viewId: view.id,
          fieldMetadataId: inverseFieldMetadataId,
          operand: ViewFilterOperand.IS,
          value: JSON.stringify({
            selectedRecordIds: [],
            isCurrentRecordSelected: true,
          }),
          relationTargetFieldMetadataId: junctionSourceField.id,
        },
      });

      this.logger.log(
        `Scoped view ${view.id} of widget ${flatWidget.id} to the current record in workspace ${workspaceId}`,
      );
    }
  }
}
