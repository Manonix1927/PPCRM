import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JunctionParentCascadeService } from 'src/engine/api/graphql/workspace-query-runner/listeners/junction-parent-cascade.service';
import { TelemetryListener } from 'src/engine/api/graphql/workspace-query-runner/listeners/telemetry.listener';
import { WorkspaceQueryHookModule } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/workspace-query-hook.module';
import { FeatureFlagEntity } from 'src/engine/core-modules/feature-flag/feature-flag.entity';
import { FileModule } from 'src/engine/core-modules/file/file.module';
import { RecordPositionModule } from 'src/engine/core-modules/record-position/record-position.module';
import { RecordTransformerModule } from 'src/engine/core-modules/record-transformer/record-transformer.module';
import { TelemetryModule } from 'src/engine/core-modules/telemetry/telemetry.module';
import { WorkspaceManyOrAllFlatEntityMapsCacheModule } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.module';
import { SubscriptionsModule } from 'src/engine/subscriptions/subscriptions.module';
import { WorkspaceDataSourceModule } from 'src/engine/workspace-datasource/workspace-datasource.module';

import { EntityEventsToDbListener } from './listeners/entity-events-to-db.listener';

@Module({
  imports: [
    WorkspaceDataSourceModule,
    WorkspaceQueryHookModule,
    TypeOrmModule.forFeature([FeatureFlagEntity]),
    TelemetryModule,
    FileModule,
    RecordTransformerModule,
    RecordPositionModule,
    SubscriptionsModule,
    WorkspaceManyOrAllFlatEntityMapsCacheModule,
  ],
  providers: [EntityEventsToDbListener, TelemetryListener, JunctionParentCascadeService],
})
export class WorkspaceQueryRunnerModule {}
