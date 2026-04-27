import { i18n, type MessageDescriptor } from '@lingui/core';
import { isString } from '@sniptt/guards';
import { type Nullable } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

const TEMPLATE_PREFIXES = [
  'Permanently destroy',
  'Navigate to previous',
  'Navigate to next',
  'See deleted',
  'Hide deleted',
  'Create new',
  'Remove from Favorites',
  'Add to Favorites',
  'Export',
  'Import',
  'Delete',
  'Restore',
  'Update',
  'Merge',
  'Deleted',
] as const;

const COMMAND_MENU_TRANSLATIONS_BY_LOCALE: Partial<
  Record<string, Partial<Record<string, string>>>
> = {
  'ru-RU': {
    'Ask AI': 'Спросить AI',
    'Compose Email': 'Написать письмо',
    'Create View': 'Создать представление',
    'Go to Accounts Settings': 'Перейти в настройки аккаунтов',
    'Go to Calendars Settings': 'Перейти в настройки календарей',
    'Go to Data Model Settings': 'Перейти в настройки модели данных',
    'Go to Emails Settings': 'Перейти в настройки почты',
    'Go to Experience Settings': 'Перейти в настройки интерфейса',
    'Go to General Settings': 'Перейти в общие настройки',
    'Go to Members Settings': 'Перейти в настройки участников',
    'Go to Roles Settings': 'Перейти в настройки ролей',
    'Go to Settings': 'Перейти в настройки',
    'Go to Domains Settings': 'Перейти в настройки доменов',
    'Import': 'Импорт',
    'Export': 'Экспорт',
    'Search': 'Поиск',
    'View Previous AI Chats': 'Предыдущие чаты AI',

    // Template prefixes (server sends: "<prefix> <ObjectLabel>")
    'Add to Favorites': 'Добавить в избранное',
    'Create new': 'Создать',
    'Delete': 'Удалить',
    'Deleted': 'Удалённые',
    'Hide deleted': 'Скрыть удалённые',
    'Merge': 'Объединить',
    'Navigate to next': 'Перейти к следующему',
    'Navigate to previous': 'Перейти к предыдущему',
    'Permanently destroy': 'Удалить навсегда',
    'Remove from Favorites': 'Убрать из избранного',
    'Restore': 'Восстановить',
    'See deleted': 'Показать удалённые',
    'Update': 'Обновить',
  },
  'uk-UA': {
    'Ask AI': 'Запитати AI',
    'Compose Email': 'Написати лист',
    'Create View': 'Створити подання',
    'Go to Accounts Settings': 'Перейти до налаштувань облікових записів',
    'Go to Calendars Settings': 'Перейти до налаштувань календарів',
    'Go to Data Model Settings': 'Перейти до налаштувань моделі даних',
    'Go to Emails Settings': 'Перейти до налаштувань пошти',
    'Go to Experience Settings': 'Перейти до налаштувань інтерфейсу',
    'Go to General Settings': 'Перейти до загальних налаштувань',
    'Go to Members Settings': 'Перейти до налаштувань учасників',
    'Go to Roles Settings': 'Перейти до налаштувань ролей',
    'Go to Settings': 'Перейти до налаштувань',
    'Go to Domains Settings': 'Перейти до налаштувань доменів',
    'Import': 'Імпорт',
    'Export': 'Експорт',
    'Search': 'Пошук',
    'View Previous AI Chats': 'Попередні чати AI',

    // Template prefixes
    'Add to Favorites': 'Додати до обраного',
    'Create new': 'Створити',
    'Delete': 'Видалити',
    'Deleted': 'Видалені',
    'Hide deleted': 'Приховати видалені',
    'Merge': "Об’єднати",
    'Navigate to next': 'Перейти до наступного',
    'Navigate to previous': 'Перейти до попереднього',
    'Permanently destroy': 'Видалити назавжди',
    'Remove from Favorites': 'Прибрати з обраного',
    'Restore': 'Відновити',
    'See deleted': 'Показати видалені',
    'Update': 'Оновити',
  },
};

const translateCommandMenuLabel = (label: string): string => {
  const locale = i18n.locale;
  const table = locale
    ? COMMAND_MENU_TRANSLATIONS_BY_LOCALE[locale]
    : undefined;

  if (!table) {
    return label;
  }

  const direct = table[label];
  if (direct) {
    return direct;
  }

  for (const prefix of TEMPLATE_PREFIXES) {
    const prefixWithSpace = `${prefix} `;
    if (label.startsWith(prefixWithSpace)) {
      const rest = label.slice(prefixWithSpace.length);
      const translatedPrefix = table[prefix] ?? prefix;
      return `${translatedPrefix} ${rest}`;
    }
  }

  return label;
};

export const getCommandMenuItemLabel = (
  label: Nullable<string | MessageDescriptor>,
): string => {
  if (!isDefined(label)) {
    return '';
  }

  if (!isString(label)) {
    return i18n._(label);
  }

  // Server-provided labels are plain strings, while Lingui catalogs are keyed
  // by message IDs, not by the english msgid string. Use a locale-aware
  // translation table for Command Menu labels.
  return translateCommandMenuLabel(label);
};
