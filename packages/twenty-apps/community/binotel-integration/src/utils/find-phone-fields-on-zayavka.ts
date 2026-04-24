import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { ZAYAVKA_NAME_SINGULAR } from 'src/constants/universal-identifiers';

export interface PhoneFieldDescriptor {
  name: string;
  label?: string | null;
}

/**
 * Запрашивает метаданные объекта "Заявки" и возвращает список полей типа PHONES.
 *
 * В будущем, если появятся другие типы (например TEXT с телефоном), можно
 * расширить этот список. Сейчас мы опираемся на стандартный тип PHONES из Twenty.
 */
export const findPhoneFieldsOnZayavka = async (
  metadataClient: InstanceType<typeof MetadataApiClient>,
): Promise<PhoneFieldDescriptor[]> => {
  const result = await metadataClient.query({
    objects: {
      __args: {
        filter: {
          nameSingular: { eq: ZAYAVKA_NAME_SINGULAR },
        },
      },
      edges: {
        node: {
          id: true,
          nameSingular: true,
          fields: {
            edges: {
              node: {
                id: true,
                name: true,
                label: true,
                type: true,
                isActive: true,
              },
            },
          },
        },
      },
    },
  } as any);

  const objectEdges = (result as any)?.objects?.edges ?? [];

  if (objectEdges.length === 0) {
    console.warn(
      `[binotel] Объект с nameSingular="${ZAYAVKA_NAME_SINGULAR}" не найден в workspace — автолинковка невозможна`,
    );
    return [];
  }

  const objectNode = objectEdges[0]?.node;
  const fieldEdges = objectNode?.fields?.edges ?? [];

  const phoneFields: PhoneFieldDescriptor[] = [];

  for (const edge of fieldEdges) {
    const field = edge?.node;
    if (!field) continue;
    if (field.isActive === false) continue;
    if (field.type !== 'PHONES') continue;
    phoneFields.push({ name: field.name, label: field.label });
  }

  return phoneFields;
};
