import { Injectable } from '@nestjs/common';

import {
  ObjectRecordCreateEvent,
  ObjectRecordDeleteEvent,
  ObjectRecordDestroyEvent,
  ObjectRecordUpdateEvent,
} from 'twenty-shared/database-events';
import { FieldMetadataType, RelationType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { WorkspaceEventEmitter } from 'src/engine/workspace-event-emitter/workspace-event-emitter';

type JunctionCascadeSourceEvent =
  | ObjectRecordCreateEvent
  | ObjectRecordDeleteEvent
  | ObjectRecordDestroyEvent;

const isJunctionSourceField = (
  field: FlatFieldMetadata,
  junctionObjectMetadataId: string,
): boolean => {
  if (
    field.type !== FieldMetadataType.RELATION &&
    field.type !== FieldMetadataType.MORPH_RELATION
  ) {
    return false;
  }

  if (field.relationTargetObjectMetadataId !== junctionObjectMetadataId) {
    return false;
  }

  if (!isDefined(field.settings) || typeof field.settings !== 'object') {
    return false;
  }

  const settings = field.settings as Record<string, unknown>;

  return (
    settings.relationType === RelationType.ONE_TO_MANY &&
    isDefined(settings.junctionTargetFieldId)
  );
};

const isJunctionToSourceField = (
  field: FlatFieldMetadata,
  sourceObjectMetadataId: string,
): boolean => {
  if (field.type !== FieldMetadataType.RELATION) return false;

  if (field.relationTargetObjectMetadataId !== sourceObjectMetadataId) {
    return false;
  }

  if (!isDefined(field.settings) || typeof field.settings !== 'object') {
    return false;
  }

  const settings = field.settings as Record<string, unknown>;

  return (
    settings.relationType === RelationType.MANY_TO_ONE &&
    isDefined(settings.joinColumnName)
  );
};

@Injectable()
export class JunctionParentCascadeService {
  constructor(
    private readonly workspaceManyOrAllFlatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
    private readonly workspaceEventEmitter: WorkspaceEventEmitter,
  ) {}

  async maybeEmitParentUpdateEvents(
    batchEvent: WorkspaceEventBatch<JunctionCascadeSourceEvent>,
  ): Promise<void> {
    const workspaceId = batchEvent.workspaceId;
    const junctionObjectMetadataId = batchEvent.objectMetadata.id;

    const { flatFieldMetadataMaps, flatObjectMetadataMaps } =
      await this.workspaceManyOrAllFlatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId,
          flatMapsKeys: ['flatFieldMetadataMaps', 'flatObjectMetadataMaps'],
        },
      );

    const allFields = Object.values(
      flatFieldMetadataMaps.byUniversalIdentifier,
    ).filter((field): field is FlatFieldMetadata => isDefined(field));

    // Find ONE_TO_MANY junction relation fields on source objects (e.g. task.assignees)
    // that point to this junction object
    const sourceFields = allFields.filter((field) =>
      isJunctionSourceField(field, junctionObjectMetadataId),
    );

    if (sourceFields.length === 0) {
      return;
    }

    const junctionFields = allFields.filter(
      (field) => field.objectMetadataId === junctionObjectMetadataId,
    );

    for (const sourceField of sourceFields) {
      const sourceObjectMetadataId = sourceField.objectMetadataId;

      const sourceObjectMetadata = findFlatEntityByIdInFlatEntityMaps({
        flatEntityId: sourceObjectMetadataId,
        flatEntityMaps: flatObjectMetadataMaps,
      });

      if (!isDefined(sourceObjectMetadata)) {
        continue;
      }

      // Find the MANY_TO_ONE field on the junction object that points back to the source object
      const junctionToSourceField = junctionFields.find((field) =>
        isJunctionToSourceField(field, sourceObjectMetadataId),
      );

      if (!isDefined(junctionToSourceField)) {
        continue;
      }

      const joinColumnName = (
        junctionToSourceField.settings as Record<string, unknown>
      ).joinColumnName as string;

      const seenSourceIds = new Set<string>();
      const syntheticEvents: ObjectRecordUpdateEvent[] = [];

      for (const event of batchEvent.events) {
        const junctionRecord = (
          event.properties as {
            after?: Record<string, unknown>;
            before?: Record<string, unknown>;
          }
        ).after ??
          (
            event.properties as {
              before?: Record<string, unknown>;
            }
          ).before;

        if (!isDefined(junctionRecord)) {
          continue;
        }

        const sourceId = junctionRecord[joinColumnName];

        if (typeof sourceId !== 'string' || seenSourceIds.has(sourceId)) {
          continue;
        }

        seenSourceIds.add(sourceId);

        syntheticEvents.push(
          Object.assign(new ObjectRecordUpdateEvent(), {
            recordId: sourceId,
            properties: {
              before: { id: sourceId },
              after: { id: sourceId },
              updatedFields: [sourceField.name],
              diff: {},
            },
          }),
        );
      }

      if (syntheticEvents.length === 0) {
        continue;
      }

      this.workspaceEventEmitter.emitDatabaseBatchEvent({
        objectMetadataNameSingular: sourceObjectMetadata.nameSingular,
        action: DatabaseEventAction.UPDATED,
        events: syntheticEvents,
        objectMetadata: sourceObjectMetadata,
        workspaceId,
      });
    }
  }
}
