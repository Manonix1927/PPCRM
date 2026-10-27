import { Module } from '@nestjs/common';

import { JunctionParentCascadeService } from 'src/engine/api/graphql/workspace-query-runner/listeners/junction-parent-cascade.service';
import { TelemetryListener } from 'src/engine/api/graphql/workspace-query-runner/listeners/telemetry.listener';
import { EventLogIngestionModule } from 'src/engine/core-modules/event-logs/ingest/event-log-ingestion.module';
import { TelemetryModule } from 'src/engine/core-modules/telemetry/telemetry.module';
import { WorkspaceManyOrAllFlatEntityMapsCacheModule } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.module';
import { WorkspaceCacheModule } from 'src/engine/workspace-cache/workspace-cache.module';
import { TimelineActivityModule } from 'src/modules/timeline/timeline-activity.module';

import { EntityEventsToDbListener } from './listeners/entity-events-to-db.listener';

@Module({
  imports: [
    TelemetryModule,
    TimelineActivityModule,
    WorkspaceCacheModule,
    EventLogIngestionModule,
    WorkspaceManyOrAllFlatEntityMapsCacheModule,
  ],
  providers: [
    EntityEventsToDbListener,
    TelemetryListener,
    JunctionParentCascadeService,
  ],
})
export class WorkspaceQueryRunnerModule {}
