import { isObject } from '@sniptt/guards';

import {
  FieldMetadataType,
  RelationType,
  type ActorFilter,
  type AddressFilter,
  type AndObjectRecordFilter,
  type ArrayFilter,
  type BooleanFilter,
  type CurrencyFilter,
  type DateFilter,
  type EmailsFilter,
  type FilesFilter,
  type FloatFilter,
  type FullNameFilter,
  type LeafObjectRecordFilter,
  type LinksFilter,
  type MultiSelectFilter,
  type NotObjectRecordFilter,
  type OrObjectRecordFilter,
  type PhonesFilter,
  type RatingFilter,
  type RawJsonFilter,
  type RecordGqlOperationFilter,
  type RichTextFilter,
  type SelectFilter,
  type StringFilter,
  type TSVectorFilter,
  type UUIDFilter,
} from 'twenty-shared/types';
import {
  computeRelationGqlFieldJoinColumnName,
  isDefined,
  isEmptyObject,
  isMatchingArrayFilter,
  isMatchingBooleanFilter,
  isMatchingCurrencyFilter,
  isMatchingDateFilter,
  isMatchingFilesFilter,
  isMatchingFloatFilter,
  isMatchingMultiSelectFilter,
  isMatchingRatingFilter,
  isMatchingRawJsonFilter,
  isMatchingRichTextFilter,
  isMatchingSelectFilter,
  isMatchingStringFilter,
  isMatchingTSVectorFilter,
  isMatchingUUIDFilter,
} from 'twenty-shared/utils';

import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { computePossibleMorphGqlFieldForFieldName } from '@/object-record/cache/utils/computePossibleMorphGqlFieldForFieldName';

const isLeafFilter = (
  filter: RecordGqlOperationFilter,
): filter is LeafObjectRecordFilter => {
  return !isAndFilter(filter) && !isOrFilter(filter) && !isNotFilter(filter);
};

const isAndFilter = (
  filter: RecordGqlOperationFilter,
): filter is AndObjectRecordFilter => 'and' in filter && !!filter.and;

const isImplicitAndFilter = (filter: RecordGqlOperationFilter) =>
  Object.keys(filter).length > 1;

const isMorphRelationJoinColumnKey = ({
  fieldMetadataItem,
  key,
}: {
  fieldMetadataItem: FieldMetadataItem;
  key: string;
}): boolean => {
  if (!fieldMetadataItem.morphRelations?.length) {
    return false;
  }

  const possibleJoinColumnNames = computePossibleMorphGqlFieldForFieldName({
    fieldMetadata: {
      morphRelations: fieldMetadataItem.morphRelations,
      fieldName: fieldMetadataItem.name,
    },
  }).map((name) => `${name}Id`);

  return possibleJoinColumnNames.includes(key);
};

const isOrFilter = (
  filter: RecordGqlOperationFilter,
): filter is OrObjectRecordFilter => 'or' in filter && !!filter.or;

const isNotFilter = (
  filter: RecordGqlOperationFilter,
): filter is NotObjectRecordFilter => 'not' in filter && !!filter.not;

const UUID_FILTER_OPERATOR_KEYS = [
  'eq',
  'neq',
  'in',
  'is',
  'gt',
  'gte',
  'lt',
  'lte',
];

// A relation filter value is a UUID leaf filter only when every key is a UUID
// comparison operator (e.g. { in: [...] }, { eq: '...' }). Anything else (or/and,
// or nested sub-fields like { name: { firstName: { ilike } } }) is a composite
// sub-filter on the related record and must not reach the UUID matcher.
const isUuidLeafFilter = (value: unknown): boolean => {
  if (!isObject(value)) {
    return false;
  }

  const keys = Object.keys(value);

  return (
    keys.length > 0 && keys.every((key) => UUID_FILTER_OPERATOR_KEYS.includes(key))
  );
};

const LEAF_FILTER_OPERATOR_KEYS = [
  ...UUID_FILTER_OPERATOR_KEYS,
  'ilike',
  'like',
  'regex',
  'startsWith',
  'search',
];

const isLeafFilterOperator = (
  value: unknown,
): value is Record<string, any> =>
  isObject(value) &&
  Object.keys(value).some((key) => LEAF_FILTER_OPERATOR_KEYS.includes(key));

const matchesLeafFilterOperator = (
  recordValue: any,
  leafFilter: Record<string, any>,
): boolean => {
  if ('ilike' in leafFilter) {
    if (typeof recordValue !== 'string') {
      return false;
    }

    const needle = String(leafFilter.ilike).replace(/%/g, '').toLowerCase();

    return recordValue.toLowerCase().includes(needle);
  }

  if ('eq' in leafFilter) return recordValue === leafFilter.eq;
  if ('neq' in leafFilter) return recordValue !== leafFilter.neq;
  if ('in' in leafFilter)
    return Array.isArray(leafFilter.in) && leafFilter.in.includes(recordValue);
  if ('is' in leafFilter)
    return leafFilter.is === 'NULL'
      ? !isDefined(recordValue)
      : isDefined(recordValue);
  if ('gt' in leafFilter) return recordValue > leafFilter.gt;
  if ('gte' in leafFilter) return recordValue >= leafFilter.gte;
  if ('lt' in leafFilter) return recordValue < leafFilter.lt;
  if ('lte' in leafFilter) return recordValue <= leafFilter.lte;

  return false;
};

// Evaluates a nested relation sub-filter against the embedded related record.
// The filter structure mirrors the record shape, so this works without target
// object field metadata (which the relation field does not carry here).
const isNestedRelationFilterMatchingRecord = (
  recordValue: any,
  filter: any,
): boolean => {
  if (!isObject(filter)) {
    return false;
  }

  if ('or' in filter && Array.isArray(filter.or)) {
    return (
      filter.or.length === 0 ||
      filter.or.some((subFilter: any) =>
        isNestedRelationFilterMatchingRecord(recordValue, subFilter),
      )
    );
  }

  if ('and' in filter && Array.isArray(filter.and)) {
    return filter.and.every((subFilter: any) =>
      isNestedRelationFilterMatchingRecord(recordValue, subFilter),
    );
  }

  if ('not' in filter && isObject(filter.not)) {
    return !isNestedRelationFilterMatchingRecord(recordValue, filter.not);
  }

  if (isLeafFilterOperator(filter)) {
    return matchesLeafFilterOperator(recordValue, filter);
  }

  return Object.entries(filter).every(([key, subFilter]) =>
    isNestedRelationFilterMatchingRecord(
      isObject(recordValue) ? (recordValue as any)[key] : undefined,
      subFilter,
    ),
  );
};

export const isRecordMatchingFilter = ({
  record,
  filter,
  objectMetadataItem,
}: {
  record: any;
  filter: RecordGqlOperationFilter;
  objectMetadataItem: EnrichedObjectMetadataItem;
}): boolean => {
  if (Object.keys(filter).length === 0 && record.deletedAt === null) {
    return true;
  }

  if (isImplicitAndFilter(filter)) {
    return Object.entries(filter).every(([filterKey, value]) =>
      isRecordMatchingFilter({
        record,
        filter: { [filterKey]: value },
        objectMetadataItem,
      }),
    );
  }

  if (isAndFilter(filter)) {
    const filterValue = filter.and;

    if (!Array.isArray(filterValue)) {
      throw new Error(
        'Unexpected value for "and" filter : ' + JSON.stringify(filterValue),
      );
    }

    return (
      filterValue.length === 0 ||
      filterValue.every((andFilter) =>
        isRecordMatchingFilter({
          record,
          filter: andFilter,
          objectMetadataItem,
        }),
      )
    );
  }

  if (isOrFilter(filter)) {
    const filterValue = filter.or;

    if (Array.isArray(filterValue)) {
      return (
        filterValue.length === 0 ||
        filterValue.some((orFilter) =>
          isRecordMatchingFilter({
            record,
            filter: orFilter,
            objectMetadataItem,
          }),
        )
      );
    }

    if (isObject(filterValue)) {
      // The API considers "or" with an object as an "and"
      return isRecordMatchingFilter({
        record,
        filter: filterValue,
        objectMetadataItem,
      });
    }

    throw new Error('Unexpected value for "or" filter : ' + filterValue);
  }

  if (isNotFilter(filter)) {
    const filterValue = filter.not;

    if (!isDefined(filterValue)) {
      throw new Error('Unexpected value for "not" filter : ' + filterValue);
    }

    return (
      isEmptyObject(filterValue) ||
      !isRecordMatchingFilter({
        record,
        filter: filterValue,
        objectMetadataItem,
      })
    );
  }

  if (isLeafFilter(filter)) {
    if (isDefined(record.deletedAt) && filter.deletedAt === undefined) {
      return false;
    }
  }

  return Object.entries(filter).every(([filterKey, filterValue]) => {
    if (!isDefined(filterValue)) {
      throw new Error(
        'Unexpected value for filter key "' + filterKey + '" : ' + filterValue,
      );
    }

    if (isEmptyObject(filterValue)) return true;

    const objectMetadataField =
      objectMetadataItem.fields.find((field) => field.name === filterKey) ??
      objectMetadataItem.fields.find(
        (field) =>
          (field.type === FieldMetadataType.RELATION ||
            field.type === FieldMetadataType.MORPH_RELATION) &&
          computeRelationGqlFieldJoinColumnName({ name: field.name }) ===
            filterKey,
      ) ??
      objectMetadataItem.fields.find(
        (field) =>
          field.type === FieldMetadataType.MORPH_RELATION &&
          isMorphRelationJoinColumnKey({
            fieldMetadataItem: field,
            key: filterKey,
          }),
      );

    if (!isDefined(objectMetadataField)) {
      throw new Error(
        'Field metadata item "' +
          filterKey +
          '" not found for object metadata item ' +
          objectMetadataItem.nameSingular,
      );
    }

    switch (objectMetadataField.type) {
      case FieldMetadataType.RATING:
        return isMatchingRatingFilter({
          ratingFilter: filterValue as RatingFilter,
          value: record[filterKey],
        });
      case FieldMetadataType.TEXT: {
        return isMatchingStringFilter({
          stringFilter: filterValue as StringFilter,
          value: record[filterKey],
        });
      }
      case FieldMetadataType.RICH_TEXT: {
        return isMatchingRichTextFilter({
          richTextFilter: filterValue as RichTextFilter,
          value: record[filterKey],
        });
      }
      case FieldMetadataType.SELECT:
        return isMatchingSelectFilter({
          selectFilter: filterValue as SelectFilter,
          value: record[filterKey],
        });
      case FieldMetadataType.MULTI_SELECT:
        return isMatchingMultiSelectFilter({
          multiSelectFilter: filterValue as MultiSelectFilter,
          value: record[filterKey],
        });
      case FieldMetadataType.ARRAY: {
        return isMatchingArrayFilter({
          arrayFilter: filterValue as ArrayFilter,
          value: record[filterKey],
        });
      }
      case FieldMetadataType.RAW_JSON: {
        return isMatchingRawJsonFilter({
          rawJsonFilter: filterValue as RawJsonFilter,
          value: record[filterKey],
        });
      }
      case FieldMetadataType.FILES: {
        return isMatchingFilesFilter({
          filesFilter: filterValue as FilesFilter,
          value: record[filterKey],
        });
      }
      case FieldMetadataType.FULL_NAME: {
        const fullNameFilter = filterValue as FullNameFilter;

        return (
          (fullNameFilter.firstName === undefined ||
            isMatchingStringFilter({
              stringFilter: fullNameFilter.firstName,
              value: record[filterKey]?.firstName,
            })) &&
          (fullNameFilter.lastName === undefined ||
            isMatchingStringFilter({
              stringFilter: fullNameFilter.lastName,
              value: record[filterKey]?.lastName,
            }))
        );
      }
      case FieldMetadataType.ADDRESS: {
        const addressFilter = filterValue as AddressFilter;

        const keys = [
          'addressStreet1',
          'addressStreet2',
          'addressCity',
          'addressState',
          'addressCountry',
          'addressPostcode',
        ] as const;

        return keys.some((key) => {
          const value = addressFilter[key];
          if (value === undefined) {
            return false;
          }

          return isMatchingStringFilter({
            stringFilter: value,
            value: record[filterKey]?.[key],
          });
        });
      }
      case FieldMetadataType.LINKS: {
        const linksFilter = filterValue as LinksFilter;

        const keys = ['primaryLinkLabel', 'primaryLinkUrl'] as const;

        return keys.some((key) => {
          const value = linksFilter[key];
          if (value === undefined) {
            return false;
          }

          return isMatchingStringFilter({
            stringFilter: value,
            value: record[filterKey]?.[key],
          });
        });
      }
      case FieldMetadataType.DATE:
      case FieldMetadataType.DATE_TIME: {
        return isMatchingDateFilter({
          dateFilter: filterValue as DateFilter,
          value: record[filterKey],
        });
      }
      case FieldMetadataType.NUMBER:
      case FieldMetadataType.NUMERIC:
      case FieldMetadataType.POSITION: {
        return isMatchingFloatFilter({
          floatFilter: filterValue as FloatFilter,
          value: record[filterKey],
        });
      }
      case FieldMetadataType.UUID: {
        return isMatchingUUIDFilter({
          uuidFilter: filterValue as UUIDFilter,
          value: record[filterKey],
        });
      }
      case FieldMetadataType.BOOLEAN: {
        return isMatchingBooleanFilter({
          booleanFilter: filterValue as BooleanFilter,
          value: record[filterKey],
        });
      }
      case FieldMetadataType.CURRENCY: {
        return isMatchingCurrencyFilter({
          currencyFilter: filterValue as CurrencyFilter,
          value: record[filterKey],
        });
      }
      case FieldMetadataType.ACTOR: {
        const actorFilter = filterValue as ActorFilter;

        if (isDefined(actorFilter.workspaceMemberId)) {
          return isMatchingUUIDFilter({
            uuidFilter: actorFilter.workspaceMemberId,
            value: record[filterKey]?.workspaceMemberId,
          });
        }

        if (isDefined(actorFilter.source)) {
          return isMatchingSelectFilter({
            selectFilter: actorFilter.source,
            value: record[filterKey].source,
          });
        }

        return (
          actorFilter.name === undefined ||
          isMatchingStringFilter({
            stringFilter: actorFilter.name,
            value: record[filterKey]?.name,
          })
        );
      }
      case FieldMetadataType.EMAILS: {
        const emailsFilter = filterValue as EmailsFilter;

        if (emailsFilter.primaryEmail === undefined) {
          return false;
        }

        return isMatchingStringFilter({
          stringFilter: emailsFilter.primaryEmail,
          value: record[filterKey]?.primaryEmail,
        });
      }
      case FieldMetadataType.PHONES: {
        const phonesFilter = filterValue as PhonesFilter;

        const keys: (keyof PhonesFilter)[] = ['primaryPhoneNumber'];

        return keys.some((key) => {
          const value = phonesFilter[key];
          if (value === undefined) {
            return false;
          }

          return isMatchingStringFilter({
            stringFilter: value,
            value: record[filterKey]?.[key],
          });
        });
      }
      case FieldMetadataType.RELATION:
      case FieldMetadataType.MORPH_RELATION: {
        const isJoinColumn =
          computeRelationGqlFieldJoinColumnName({
            name: objectMetadataField.name,
          }) === filterKey ||
          (objectMetadataField.type === FieldMetadataType.MORPH_RELATION &&
            isMorphRelationJoinColumnKey({
              fieldMetadataItem: objectMetadataField,
              key: filterKey,
            }));

        if (isJoinColumn) {
          return isMatchingUUIDFilter({
            uuidFilter: filterValue as UUIDFilter,
            value: record[filterKey],
          });
        }

        const isJunctionRelation =
          objectMetadataField.relation?.type === RelationType.ONE_TO_MANY &&
          isDefined(objectMetadataField.settings) &&
          'junctionTargetFieldId' in objectMetadataField.settings &&
          isDefined(
            (
              objectMetadataField.settings as {
                junctionTargetFieldId?: string;
              }
            ).junctionTargetFieldId,
          );

        if (isJunctionRelation) {
          const connection = record[filterKey] as
            | { edges?: Array<{ node?: Record<string, unknown> }> }
            | undefined;
          const edges = connection?.edges ?? [];
          const filterAsRecord = filterValue as Record<string, unknown>;

          if ('is' in filterAsRecord) {
            const wantsEmpty = filterAsRecord.is === 'NULL';

            return wantsEmpty ? edges.length === 0 : edges.length > 0;
          }

          if ('in' in filterAsRecord) {
            const ids = Array.isArray(filterAsRecord.in)
              ? (filterAsRecord.in as unknown[])
              : [];

            if (ids.length === 0) {
              return false;
            }

            return edges.some((edge) => {
              const node = edge?.node ?? {};

              return Object.values(node).some((nested) => {
                if (
                  isObject(nested) &&
                  'id' in (nested as Record<string, unknown>)
                ) {
                  return ids.includes(
                    (nested as Record<string, unknown>).id as unknown,
                  );
                }

                return false;
              });
            });
          }

          return false;
        }

        const relatedRecord = record[filterKey];

        if (isUuidLeafFilter(filterValue)) {
          return isMatchingUUIDFilter({
            uuidFilter: filterValue as UUIDFilter,
            value: relatedRecord?.id ?? null,
          });
        }

        // Saved views can filter a relation by a nested sub-filter on the
        // related record (e.g. searching a contact by name). Evaluate it against
        // the embedded related record instead of crashing in the UUID matcher.
        if (!isDefined(relatedRecord)) {
          return false;
        }

        return isNestedRelationFilterMatchingRecord(relatedRecord, filterValue);
      }
      case FieldMetadataType.TS_VECTOR: {
        return isMatchingTSVectorFilter({
          tsVectorFilter: filterValue as TSVectorFilter,
          value: record[filterKey],
        });
      }
      default: {
        throw new Error(
          `Not implemented yet for field type "${objectMetadataField.type}"`,
        );
      }
    }
  });
};
