import 'reflect-metadata';

import { WasIntroducedInUpgrade } from 'src/engine/core-modules/upgrade/decorators/was-introduced-in-upgrade.decorator';
import { WasRemovedInUpgrade } from 'src/engine/core-modules/upgrade/decorators/was-removed-in-upgrade.decorator';
import { WasRenamedInUpgrade } from 'src/engine/core-modules/upgrade/decorators/was-renamed-in-upgrade.decorator';
import {
  inferAppliedUpgradeStepNamesFromPhysicalSchema,
  type UpgradeAwareEntitySchemaDescriptor,
} from 'src/engine/twenty-orm/upgrade-aware/resolve-applied-upgrade-steps-from-schema.util';

const DROP_IS_CUSTOM_STEP = '2.12.0_DropIsCustom_1780579070012';
const RENAME_PERMISSION_FLAG_STEP = '2.6.0_RenamePermissionFlag_1778235340020';
const FINALIZE_CUTOVER_STEP = '2.7.0_FinalizeCutover_1779600000000';
const LINK_PERMISSION_FLAG_STEP = '2.6.0_LinkPermissionFlag_1778235340022';
const ADD_IS_UI_EDITABLE_STEP = '2.13.0_AddIsUIEditable_1781277453604';

class ObjectMetadataLikeEntity {
  @WasRemovedInUpgrade({ upgradeCommandName: DROP_IS_CUSTOM_STEP })
  isCustom!: boolean;

  @WasIntroducedInUpgrade({ upgradeCommandName: ADD_IS_UI_EDITABLE_STEP })
  isUIEditable!: boolean;
}

@WasRenamedInUpgrade([
  {
    previousName: 'permissionFlag',
    upgradeCommandName: RENAME_PERMISSION_FLAG_STEP,
  },
])
class RolePermissionFlagLikeEntity {
  @WasRemovedInUpgrade({ upgradeCommandName: FINALIZE_CUTOVER_STEP })
  flag!: string;

  @WasIntroducedInUpgrade({ upgradeCommandName: LINK_PERMISSION_FLAG_STEP })
  permissionFlagId!: string;

  roleId!: string;
}

const buildColumnMap = (columnNames: string[]): ReadonlyMap<string, string> =>
  new Map(columnNames.map((columnName) => [columnName, columnName]));

const objectDescriptor: UpgradeAwareEntitySchemaDescriptor = {
  entityClass: ObjectMetadataLikeEntity,
  schema: 'core',
  canonicalTableName: 'objectMetadata',
  columnDatabaseNamesByPropertyName: buildColumnMap([
    'isCustom',
    'isUIEditable',
  ]),
};

const rolePermissionFlagDescriptor: UpgradeAwareEntitySchemaDescriptor = {
  entityClass: RolePermissionFlagLikeEntity,
  schema: 'core',
  canonicalTableName: 'rolePermissionFlag',
  columnDatabaseNamesByPropertyName: buildColumnMap([
    'flag',
    'permissionFlagId',
    'roleId',
  ]),
};

const buildPhysical = (columnsByTablePath: Record<string, string[]>) => ({
  columnsByTablePath: new Map(
    Object.entries(columnsByTablePath).map(([path, columns]) => [
      path,
      new Set(columns),
    ]),
  ),
});

describe('inferAppliedUpgradeStepNamesFromPhysicalSchema', () => {
  it('marks fully migrated schema steps as applied (the reported broken instance)', () => {
    // DB already at target shape: isCustom dropped, table renamed to
    // rolePermissionFlag, flag dropped, permissionFlagId + isUIEditable present.
    const physical = buildPhysical({
      'core.objectMetadata': ['id', 'isUIEditable'],
      'core.rolePermissionFlag': ['id', 'roleId', 'permissionFlagId'],
    });

    const applied = inferAppliedUpgradeStepNamesFromPhysicalSchema({
      physical,
      descriptors: [objectDescriptor, rolePermissionFlagDescriptor],
    });

    expect(applied.has(DROP_IS_CUSTOM_STEP)).toBe(true);
    expect(applied.has(RENAME_PERMISSION_FLAG_STEP)).toBe(true);
    expect(applied.has(FINALIZE_CUTOVER_STEP)).toBe(true);
    expect(applied.has(LINK_PERMISSION_FLAG_STEP)).toBe(true);
    expect(applied.has(ADD_IS_UI_EDITABLE_STEP)).toBe(true);
  });

  it('marks pre-migration schema steps as not applied', () => {
    // DB still at old shape: isCustom present, old permissionFlag join table,
    // flag present, no permissionFlagId, no isUIEditable.
    const physical = buildPhysical({
      'core.objectMetadata': ['id', 'isCustom'],
      'core.permissionFlag': ['id', 'roleId', 'flag'],
    });

    const applied = inferAppliedUpgradeStepNamesFromPhysicalSchema({
      physical,
      descriptors: [objectDescriptor, rolePermissionFlagDescriptor],
    });

    expect(applied.has(DROP_IS_CUSTOM_STEP)).toBe(false);
    expect(applied.has(RENAME_PERMISSION_FLAG_STEP)).toBe(false);
    expect(applied.has(FINALIZE_CUTOVER_STEP)).toBe(false);
    expect(applied.has(LINK_PERMISSION_FLAG_STEP)).toBe(false);
    expect(applied.has(ADD_IS_UI_EDITABLE_STEP)).toBe(false);
  });

  it('treats a removal step as applied when the column is missing on any referencing table', () => {
    const secondObjectDescriptor: UpgradeAwareEntitySchemaDescriptor = {
      entityClass: ObjectMetadataLikeEntity,
      schema: 'core',
      canonicalTableName: 'fieldMetadata',
      columnDatabaseNamesByPropertyName: buildColumnMap([
        'isCustom',
        'isUIEditable',
      ]),
    };

    // isCustom dropped from fieldMetadata but still lingering on objectMetadata.
    const physical = buildPhysical({
      'core.objectMetadata': ['id', 'isCustom', 'isUIEditable'],
      'core.fieldMetadata': ['id', 'isUIEditable'],
    });

    const applied = inferAppliedUpgradeStepNamesFromPhysicalSchema({
      physical,
      descriptors: [objectDescriptor, secondObjectDescriptor],
    });

    expect(applied.has(DROP_IS_CUSTOM_STEP)).toBe(true);
  });

  it('requires an introduction step column on every referencing table', () => {
    const secondObjectDescriptor: UpgradeAwareEntitySchemaDescriptor = {
      entityClass: ObjectMetadataLikeEntity,
      schema: 'core',
      canonicalTableName: 'fieldMetadata',
      columnDatabaseNamesByPropertyName: buildColumnMap([
        'isCustom',
        'isUIEditable',
      ]),
    };

    // isUIEditable present on objectMetadata but not yet on fieldMetadata.
    const physical = buildPhysical({
      'core.objectMetadata': ['id', 'isUIEditable'],
      'core.fieldMetadata': ['id'],
    });

    const applied = inferAppliedUpgradeStepNamesFromPhysicalSchema({
      physical,
      descriptors: [objectDescriptor, secondObjectDescriptor],
    });

    expect(applied.has(ADD_IS_UI_EDITABLE_STEP)).toBe(false);
  });
});
