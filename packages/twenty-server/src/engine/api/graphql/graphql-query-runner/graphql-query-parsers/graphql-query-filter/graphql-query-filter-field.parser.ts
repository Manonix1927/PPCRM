import { randomBytes } from 'crypto';
import { Logger } from '@nestjs/common';
import { msg } from '@lingui/core/macro';
import { RelationType } from 'twenty-shared/types';
import { compositeTypeDefinitions } from 'twenty-shared/types';
import { capitalize, isDefined } from 'twenty-shared/utils';
import { type WhereExpressionBuilder } from 'typeorm';

import {
  GraphqlQueryRunnerException,
  GraphqlQueryRunnerExceptionCode,
} from 'src/engine/api/graphql/graphql-query-runner/errors/graphql-query-runner.exception';
import { computeWhereConditionParts } from 'src/engine/api/graphql/graphql-query-runner/utils/compute-where-condition-parts';
import { type CompositeFieldMetadataType } from 'src/engine/metadata-modules/field-metadata/types/composite-field-metadata-type.type';
import { isCompositeFieldMetadataType } from 'src/engine/metadata-modules/field-metadata/utils/is-composite-field-metadata-type.util';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { buildFieldMapsFromFlatObjectMetadata } from 'src/engine/metadata-modules/flat-field-metadata/utils/build-field-maps-from-flat-object-metadata.util';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { computeTableName } from 'src/engine/utils/compute-table-name.util';

const ARRAY_OPERATORS = ['in', 'contains', 'notContains'];

export class GraphqlQueryFilterFieldParser {
  private readonly logger = new Logger(GraphqlQueryFilterFieldParser.name);
  private flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
  private flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>;
  private flatObjectMetadata: FlatObjectMetadata;
  private fieldIdByName: Record<string, string>;
  private fieldIdByJoinColumnName: Record<string, string>;

  constructor(
    flatObjectMetadata: FlatObjectMetadata,
    flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>,
    flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>,
  ) {
    this.flatObjectMetadata = flatObjectMetadata;
    this.flatFieldMetadataMaps = flatFieldMetadataMaps;
    this.flatObjectMetadataMaps = flatObjectMetadataMaps;

    const fieldMaps = buildFieldMapsFromFlatObjectMetadata(
      flatFieldMetadataMaps,
      flatObjectMetadata,
    );

    this.fieldIdByName = fieldMaps.fieldIdByName;
    this.fieldIdByJoinColumnName = fieldMaps.fieldIdByJoinColumnName;
  }

  public parse(
    queryBuilder: WhereExpressionBuilder,
    objectNameSingular: string,
    key: string,
    // oxlint-disable-next-line @typescripttypescript/no-explicit-any
    filterValue: any,
    isFirst = false,
    useDirectTableReference = false,
  ): void {
    const fieldMetadataId =
      this.fieldIdByName[`${key}`] || this.fieldIdByJoinColumnName[`${key}`];

    const fieldMetadata = findFlatEntityByIdInFlatEntityMaps({
      flatEntityId: fieldMetadataId,
      flatEntityMaps: this.flatFieldMetadataMaps,
    });

    if (!isDefined(fieldMetadata)) {
      throw new Error(`Field metadata not found for field: ${key}`);
    }

    if (isCompositeFieldMetadataType(fieldMetadata.type)) {
      return this.parseCompositeFieldForFilter(
        queryBuilder,
        fieldMetadata,
        objectNameSingular,
        filterValue,
        isFirst,
        useDirectTableReference,
      );
    }
    const [[operator, value]] = Object.entries(filterValue);

    const isJunction = this.isJunctionRelationFilter(fieldMetadata);

    if (
      fieldMetadata.type === 'RELATION' ||
      fieldMetadata.type === 'MORPH_RELATION'
    ) {
      this.logger.log(
        `[FilterFieldParser] key=${key} field=${fieldMetadata.name} type=${fieldMetadata.type} isJunction=${isJunction} op=${operator} settings=${JSON.stringify(
          fieldMetadata.settings,
        )} relationTargetObjectMetadataId=${fieldMetadata.relationTargetObjectMetadataId}`,
      );
    }

    if (isJunction) {
      return this.parseJunctionRelationForFilter({
        queryBuilder,
        objectNameSingular,
        fieldMetadata,
        operator,
        value,
        isFirst,
      });
    }

    if (
      ARRAY_OPERATORS.includes(operator) &&
      (!Array.isArray(value) || value.length === 0)
    ) {
      throw new GraphqlQueryRunnerException(
        `Invalid filter value for field ${key}. Expected non-empty array`,
        GraphqlQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
        { userFriendlyMessage: msg`Invalid filter value: "${value}"` },
      );
    }
    const { sql, params } = computeWhereConditionParts({
      operator,
      objectNameSingular,
      key,
      value,
      fieldMetadataType: fieldMetadata.type,
      useDirectTableReference,
    });

    if (isFirst) {
      queryBuilder.where(sql, params);
    } else {
      queryBuilder.andWhere(sql, params);
    }
  }

  private isJunctionRelationFilter(fieldMetadata: FlatFieldMetadata): boolean {
    return (
      isDefined(fieldMetadata.settings) &&
      'junctionTargetFieldId' in fieldMetadata.settings &&
      isDefined(fieldMetadata.settings.junctionTargetFieldId) &&
      'relationType' in fieldMetadata.settings &&
      fieldMetadata.settings.relationType === RelationType.ONE_TO_MANY &&
      isDefined(fieldMetadata.relationTargetObjectMetadataId)
    );
  }

  private parseJunctionRelationForFilter({
    queryBuilder,
    objectNameSingular,
    fieldMetadata,
    operator,
    value,
    isFirst,
  }: {
    queryBuilder: WhereExpressionBuilder;
    objectNameSingular: string;
    fieldMetadata: FlatFieldMetadata;
    operator: string;
    // oxlint-disable-next-line @typescripttypescript/no-explicit-any
    value: any;
    isFirst: boolean;
  }): void {
    const junctionObjectMetadata = findFlatEntityByIdInFlatEntityMaps({
      flatEntityId: fieldMetadata.relationTargetObjectMetadataId!,
      flatEntityMaps: this.flatObjectMetadataMaps,
    });

    if (!junctionObjectMetadata) {
      throw new Error(
        `Junction object metadata not found for field: ${fieldMetadata.name}`,
      );
    }

    const junctionTargetFieldId = (fieldMetadata.settings as any)
      .junctionTargetFieldId as string | undefined;

    if (!junctionTargetFieldId) {
      throw new Error(
        `junctionTargetFieldId not set for field: ${fieldMetadata.name}`,
      );
    }

    const junctionToTargetField = findFlatEntityByIdInFlatEntityMaps({
      flatEntityId: junctionTargetFieldId,
      flatEntityMaps: this.flatFieldMetadataMaps,
    });

    if (!junctionToTargetField) {
      throw new Error(
        `Junction target field metadata not found for id: ${junctionTargetFieldId}`,
      );
    }

    const junctionToTargetJoinColumnName = (junctionToTargetField.settings as any)
      ?.joinColumnName as string | undefined;

    if (!junctionToTargetJoinColumnName) {
      throw new Error(
        `joinColumnName not found for junction target field: ${junctionToTargetField.name}`,
      );
    }

    const junctionFields = Object.values(
      this.flatFieldMetadataMaps.byUniversalIdentifier,
    ).filter((f) => f.objectMetadataId === junctionObjectMetadata.id);

    const junctionToSourceField = junctionFields.find(
      (f) =>
        isDefined(f.settings) &&
        'relationType' in f.settings &&
        f.settings.relationType === RelationType.MANY_TO_ONE &&
        isDefined(f.settings.joinColumnName) &&
        f.relationTargetObjectMetadataId === this.flatObjectMetadata.id,
    );

    const junctionToSourceJoinColumnName = (junctionToSourceField?.settings as any)
      ?.joinColumnName as string | undefined;

    if (!junctionToSourceJoinColumnName) {
      throw new Error(
        `joinColumnName not found for junction->source relation on ${junctionObjectMetadata.nameSingular}`,
      );
    }

    const paramSuffix = randomBytes(5).toString('hex');
    const junctionAlias = `${junctionObjectMetadata.nameSingular}_${paramSuffix}`;
    // Use the current workspace schema (e.g. "workspace_xxx") and the physical tableName
    // computed by the entity schema factory.
    // NOTE: ObjectMetadata.targetTableName is deprecated and may be set to "DEPRECATED".
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workspaceSchema = (queryBuilder as any)?.expressionMap?.mainAlias?.metadata
      ?.schema as string | undefined;
    const junctionPhysicalTableName = computeTableName(
      junctionObjectMetadata.nameSingular,
      junctionObjectMetadata.isCustom,
    );
    const junctionFrom =
      isDefined(workspaceSchema) && workspaceSchema.length > 0
        ? `"${workspaceSchema}"."${junctionPhysicalTableName}"`
        : `"${junctionPhysicalTableName}"`;

    // Ignore soft-deleted junction rows so stale assignments don't leak into filters.
    const existsBaseSql = `EXISTS (SELECT 1 FROM ${junctionFrom} "${junctionAlias}" WHERE "${junctionAlias}"."${junctionToSourceJoinColumnName}" = "${objectNameSingular}"."id" AND "${junctionAlias}"."deletedAt" IS NULL`;

    let sql: string;
    let params: Record<string, unknown> = {};

    if (operator === 'in') {
      if (!Array.isArray(value) || value.length === 0) {
        throw new GraphqlQueryRunnerException(
          `Invalid filter value for field ${fieldMetadata.name}. Expected non-empty array`,
          GraphqlQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
          { userFriendlyMessage: msg`Invalid filter value: "${value}"` },
        );
      }

      const paramKey = `${fieldMetadata.name}${paramSuffix}`;
      sql =
        `${existsBaseSql} AND "${junctionAlias}"."${junctionToTargetJoinColumnName}" IN (:...${paramKey}))`;
      params = { [paramKey]: value };
    } else if (operator === 'is') {
      // "IS NULL" means "no junction rows", "IS NOT NULL" means "has at least one"
      const wantsEmpty = value === 'NULL';
      sql = wantsEmpty ? `NOT ${existsBaseSql})` : `${existsBaseSql})`;
    } else {
      throw new GraphqlQueryRunnerException(
        `Operator "${operator}" is not supported for junction relation filters`,
        GraphqlQueryRunnerExceptionCode.UNSUPPORTED_OPERATOR,
        { userFriendlyMessage: msg`Unsupported operator` },
      );
    }

    this.logger.log(
      `[JunctionFilter] field=${fieldMetadata.name} op=${operator} value=${JSON.stringify(
        value,
      )} isFirst=${isFirst} sql=${sql} params=${JSON.stringify(params)}`,
    );

    if (isFirst) {
      queryBuilder.where(sql, params);
    } else {
      queryBuilder.andWhere(sql, params);
    }
  }

  private parseCompositeFieldForFilter(
    queryBuilder: WhereExpressionBuilder,
    fieldMetadata: FlatFieldMetadata,
    objectNameSingular: string,
    // oxlint-disable-next-line @typescripttypescript/no-explicit-any
    fieldValue: any,
    isFirst = false,
    useDirectTableReference = false,
  ): void {
    const compositeType = compositeTypeDefinitions.get(
      fieldMetadata.type as CompositeFieldMetadataType,
    );

    if (!compositeType) {
      throw new Error(
        `Composite type definition not found for type: ${fieldMetadata.type}`,
      );
    }

    Object.entries(fieldValue).map(([subFieldKey, subFieldFilter], index) => {
      const subFieldMetadata = compositeType.properties.find(
        (property) => property.name === subFieldKey,
      );

      if (!subFieldMetadata) {
        throw new Error(
          `Sub field metadata not found for composite type: ${fieldMetadata.type}`,
        );
      }

      const fullFieldName = `${fieldMetadata.name}${capitalize(subFieldKey)}`;

      const [[operator, value]] = Object.entries(
        // oxlint-disable-next-line @typescripttypescript/no-explicit-any
        subFieldFilter as Record<string, any>,
      );

      if (
        ARRAY_OPERATORS.includes(operator) &&
        (!Array.isArray(value) || value.length === 0)
      ) {
        throw new GraphqlQueryRunnerException(
          `Invalid filter value for field ${subFieldKey}. Expected non-empty array`,
          GraphqlQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
          { userFriendlyMessage: msg`Invalid filter value: "${value}"` },
        );
      }

      const { sql, params } = computeWhereConditionParts({
        operator,
        objectNameSingular,
        key: fullFieldName,
        subFieldKey,
        value,
        fieldMetadataType: fieldMetadata.type,
        useDirectTableReference,
      });

      if (isFirst && index === 0) {
        queryBuilder.where(sql, params);
      }

      queryBuilder.andWhere(sql, params);
    });
  }
}
