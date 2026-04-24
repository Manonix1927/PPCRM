const UA_COUNTRY_CODE = '380';

/**
 * Нормализует телефонный номер к формату "только цифры".
 * Примеры:
 *   +380 (67) 123-45-67  -> 380671234567
 *   0671234567           -> 380671234567 (добавляем префикс Украины)
 *   380671234567         -> 380671234567 (без изменений)
 *   00380671234567       -> 380671234567 (убираем 00-префикс)
 */
export const normalizePhone = (raw: string | null | undefined): string => {
  if (!raw) return '';

  const digits = raw.replace(/\D+/g, '');
  if (!digits) return '';

  if (digits.startsWith('00')) {
    return digits.slice(2);
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `${UA_COUNTRY_CODE}${digits.slice(1)}`;
  }

  return digits;
};

/**
 * Возвращает список вариантов нормализованного номера для поиска.
 * Иногда в базе номер хранится с + или без, или без кода страны.
 * Мы ищем по "хвосту" (последним 9 цифрам) — это robustный fallback.
 */
export const getPhoneSearchVariants = (raw: string | null | undefined): string[] => {
  const normalized = normalizePhone(raw);
  if (!normalized) return [];

  const variants = new Set<string>();
  variants.add(normalized);
  variants.add(`+${normalized}`);

  if (normalized.length >= 9) {
    variants.add(normalized.slice(-9));
  }
  if (normalized.length >= 10) {
    variants.add(`0${normalized.slice(-9)}`);
  }

  return Array.from(variants);
};
