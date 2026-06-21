import { type DataSource } from 'typeorm';

import { isDefined } from 'twenty-shared/utils';

import {
  getWasIntroducedInUpgradeClassMetadata,
  getWasIntroducedInUpgradePropertyMetadata,
} from 'src/engine/core-modules/upgrade/decorators/was-introduced-in-upgrade.decorator';
import { getWasRemovedInUpgradePropertyMetadata } from 'src/engine/core-modules/upgrade/decorators/was-removed-in-upgrade.decorator';
import {
  getWasRenamedInUpgradeClassMetadata,
  getWasRenamedInUpgradePropertyMetadata,
  type WasRenamedInUpgradeHistoryEntry,
} from 'src/engine/core-modules/upgrade/decorators/was-renamed-in-upgrade.decorator';

// Descriptor for one core entity in its canonical (latest-code) shape.
export type UpgradeAwareEntitySchemaDescriptor = {
  entityClass: Function;
  schema: string;
  canonicalTableName: string;
  columnDatabaseNamesByPropertyName: ReadonlyMap<string, string>;
};

type PhysicalSchema = {
  // key: `${schema}.${tableName}` -> set of physical column names
  columnsByTablePath: Map<string, Set<string>>;
};

const buildTablePath = (schema: string, tableName: string): string =>
  `${schema}.${tableName}`;

const probePhysicalSchema = async ({
  dataSource,
  schemas,
}: {
  dataSource: DataSource;
  schemas: string[];
}): Promise<PhysicalSchema> => {
  const rows = await dataSource.query<
    Array<{ table_schema: string; table_name: string; column_name: string }>
  >(
    `SELECT table_schema, table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = ANY($1)`,
    [schemas],
  );

  const columnsByTablePath = new Map<string, Set<string>>();

  for (const row of rows) {
    const path = buildTablePath(row.table_schema, row.table_name);
    const columns = columnsByTablePath.get(path) ?? new Set<string>();

    columns.add(row.column_name);
    columnsByTablePath.set(path, columns);
  }

  return { columnsByTablePath };
};

const tableExists = (physical: PhysicalSchema, tablePath: string): boolean =>
  physical.columnsByTablePath.has(tablePath);

const columnExists = (
  physical: PhysicalSchema,
  tablePath: string,
  columnName: string,
): boolean =>
  physical.columnsByTablePath.get(tablePath)?.has(columnName) ?? false;

// Resolve which physical table an entity currently maps to, and which of its
// rename steps are therefore applied. The canonical name is the latest one; a
// rename step counts as applied only when the post-rename table physically exists.
const resolvePhysicalTableNameAndAppliedRenameSteps = ({
  physical,
  schema,
  canonicalTableName,
  renameHistory,
}: {
  physical: PhysicalSchema;
  schema: string;
  canonicalTableName: string;
  renameHistory: WasRenamedInUpgradeHistoryEntry[];
}): { physicalTableName: string; appliedRenameStepNames: Set<string> } => {
  const appliedRenameStepNames = new Set<string>();

  if (tableExists(physical, buildTablePath(schema, canonicalTableName))) {
    for (const entry of renameHistory) {
      appliedRenameStepNames.add(entry.upgradeCommandName);
    }

    return { physicalTableName: canonicalTableName, appliedRenameStepNames };
  }

  // The resolver returns the previousName of the first non-applied rename, so
  // entries earlier in the history are the more recent renames. Mark each as
  // applied until we hit the previous table name that physically exists.
  for (let index = 0; index < renameHistory.length; index++) {
    const entry = renameHistory[index];

    if (tableExists(physical, buildTablePath(schema, entry.previousName))) {
      for (let applied = 0; applied < index; applied++) {
        appliedRenameStepNames.add(renameHistory[applied].upgradeCommandName);
      }

      return {
        physicalTableName: entry.previousName,
        appliedRenameStepNames,
      };
    }
  }

  // Table not found under any known name (e.g. not created yet): keep canonical
  // and add no rename steps.
  return { physicalTableName: canonicalTableName, appliedRenameStepNames };
};

// Derives the set of upgrade steps that are applied by reading the *physical*
// database schema, independent of the upgradeMigration tracking table. A removal
// step is applied once its column is gone; an introduction step once its column
// exists; a rename once the post-rename name exists. When a step is referenced by
// several decorators we resolve conservatively so a column is never SELECTed when
// it is physically absent: removals win if any reference is missing (OR),
// introductions require every reference to be present (AND).
export const inferAppliedUpgradeStepNamesFromPhysicalSchema = ({
  physical,
  descriptors,
}: {
  physical: PhysicalSchema;
  descriptors: UpgradeAwareEntitySchemaDescriptor[];
}): Set<string> => {
  const introducedStepPresent = new Map<string, boolean>();
  const removedStepMissing = new Map<string, boolean>();
  const appliedStepNames = new Set<string>();

  const voteIntroduced = (stepName: string, isPresent: boolean): void => {
    introducedStepPresent.set(
      stepName,
      (introducedStepPresent.get(stepName) ?? true) && isPresent,
    );
  };

  const voteRemoved = (stepName: string, isMissing: boolean): void => {
    removedStepMissing.set(
      stepName,
      (removedStepMissing.get(stepName) ?? false) || isMissing,
    );
  };

  for (const descriptor of descriptors) {
    const { entityClass, schema, canonicalTableName } = descriptor;

    const renameHistory =
      getWasRenamedInUpgradeClassMetadata(entityClass) ?? [];

    const { physicalTableName, appliedRenameStepNames } =
      resolvePhysicalTableNameAndAppliedRenameSteps({
        physical,
        schema,
        canonicalTableName,
        renameHistory,
      });

    for (const stepName of appliedRenameStepNames) {
      appliedStepNames.add(stepName);
    }

    const physicalTablePath = buildTablePath(schema, physicalTableName);

    // Entity-level introduction: the table itself only exists after the step.
    const classIntroduced = getWasIntroducedInUpgradeClassMetadata(entityClass);

    if (
      isDefined(classIntroduced) &&
      tableExists(physical, physicalTablePath)
    ) {
      appliedStepNames.add(classIntroduced.upgradeCommandName);
    }

    const propertyIntroductionMap =
      getWasIntroducedInUpgradePropertyMetadata(entityClass);
    const propertyRemovalMap =
      getWasRemovedInUpgradePropertyMetadata(entityClass);
    const propertyRenameMap =
      getWasRenamedInUpgradePropertyMetadata(entityClass);

    for (const [propertyName, { upgradeCommandName }] of Object.entries(
      propertyIntroductionMap,
    )) {
      const databaseName =
        descriptor.columnDatabaseNamesByPropertyName.get(propertyName) ??
        propertyName;

      voteIntroduced(
        upgradeCommandName,
        columnExists(physical, physicalTablePath, databaseName),
      );
    }

    for (const [propertyName, { upgradeCommandName }] of Object.entries(
      propertyRemovalMap,
    )) {
      const databaseName =
        descriptor.columnDatabaseNamesByPropertyName.get(propertyName) ??
        propertyName;

      voteRemoved(
        upgradeCommandName,
        !columnExists(physical, physicalTablePath, databaseName),
      );
    }

    for (const [propertyName, history] of Object.entries(propertyRenameMap)) {
      const canonicalColumnName =
        descriptor.columnDatabaseNamesByPropertyName.get(propertyName) ??
        propertyName;

      // Mirror the table rename logic at the column level.
      if (columnExists(physical, physicalTablePath, canonicalColumnName)) {
        for (const entry of history) {
          appliedStepNames.add(entry.upgradeCommandName);
        }
        continue;
      }

      for (let index = 0; index < history.length; index++) {
        if (
          columnExists(physical, physicalTablePath, history[index].previousName)
        ) {
          for (let applied = 0; applied < index; applied++) {
            appliedStepNames.add(history[applied].upgradeCommandName);
          }
          break;
        }
      }
    }
  }

  for (const [stepName, isPresent] of introducedStepPresent) {
    if (isPresent) {
      appliedStepNames.add(stepName);
    }
  }

  for (const [stepName, isMissing] of removedStepMissing) {
    if (isMissing) {
      appliedStepNames.add(stepName);
    }
  }

  return appliedStepNames;
};

export const resolveAppliedUpgradeStepNamesFromSchema = async ({
  dataSource,
  descriptors,
}: {
  dataSource: DataSource;
  descriptors: UpgradeAwareEntitySchemaDescriptor[];
}): Promise<Set<string>> => {
  const schemas = [
    ...new Set(descriptors.map((descriptor) => descriptor.schema)),
  ];

  if (schemas.length === 0) {
    return new Set<string>();
  }

  const physical = await probePhysicalSchema({ dataSource, schemas });

  return inferAppliedUpgradeStepNamesFromPhysicalSchema({
    physical,
    descriptors,
  });
};
