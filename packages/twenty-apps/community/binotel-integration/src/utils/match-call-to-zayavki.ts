import { CoreApiClient } from 'twenty-client-sdk/core';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import {
  findPhoneFieldsOnZayavka,
  type PhoneFieldDescriptor,
} from 'src/utils/find-phone-fields-on-zayavka';
import { getPhoneSearchVariants } from 'src/utils/normalize-phone';
import { ZAYAVKA_NAME_PLURAL } from 'src/constants/universal-identifiers';

export interface MatchResult {
  zayavkaId: string | null;
  matchedByFieldName: string | null;
  matchedPhoneVariant: string | null;
}

/**
 * Строит OR-фильтр по всем PHONES-полям объекта Заявки
 * и всем вариантам нормализованного номера.
 *
 * Twenty PHONES в фильтрах поддерживает форму:
 *   { someField: { primaryPhoneNumber: { eq: "380..." } } }
 *
 * Фильтрация по additionalPhones через стандартный GraphQL filter в Twenty
 * непростая (JSON-массив), поэтому на первом этапе матчим только по primary.
 */
const buildPhoneFilter = (
  phoneFields: PhoneFieldDescriptor[],
  phoneVariants: string[],
): Record<string, unknown> => {
  const orClauses: Array<Record<string, unknown>> = [];

  for (const field of phoneFields) {
    for (const variant of phoneVariants) {
      orClauses.push({
        [field.name]: {
          primaryPhoneNumber: { eq: variant },
        },
      });
    }
  }

  return { or: orClauses };
};

export const matchCallToZayavka = async (params: {
  rawPhone: string | null | undefined;
  metadataClient: InstanceType<typeof MetadataApiClient>;
  coreClient: InstanceType<typeof CoreApiClient>;
}): Promise<MatchResult> => {
  const { rawPhone, metadataClient, coreClient } = params;

  const emptyResult: MatchResult = {
    zayavkaId: null,
    matchedByFieldName: null,
    matchedPhoneVariant: null,
  };

  const phoneVariants = getPhoneSearchVariants(rawPhone);
  if (phoneVariants.length === 0) {
    console.log('[binotel] пустой номер телефона — пропускаем автолинковку');
    return emptyResult;
  }

  const phoneFields = await findPhoneFieldsOnZayavka(metadataClient);
  if (phoneFields.length === 0) {
    console.log(
      '[binotel] в объекте Заявки нет активных PHONES-полей — автолинковка невозможна',
    );
    return emptyResult;
  }

  const filter = buildPhoneFilter(phoneFields, phoneVariants);

  const queryKey = ZAYAVKA_NAME_PLURAL;
  const result = await coreClient.query({
    [queryKey]: {
      __args: {
        filter,
        first: 1,
      },
      edges: {
        node: {
          id: true,
        },
      },
    },
  } as any);

  const edges = (result as any)?.[queryKey]?.edges ?? [];
  const firstMatch = edges[0]?.node;

  if (!firstMatch?.id) {
    console.log(
      `[binotel] Заявка не найдена по номеру (варианты: ${phoneVariants.join(', ')}, поля: ${phoneFields
        .map((f) => f.name)
        .join(', ')})`,
    );
    return emptyResult;
  }

  console.log(
    `[binotel] Заявка ${firstMatch.id} найдена по номеру ${phoneVariants[0]}`,
  );

  return {
    zayavkaId: firstMatch.id,
    matchedByFieldName: phoneFields[0]?.name ?? null,
    matchedPhoneVariant: phoneVariants[0] ?? null,
  };
};
