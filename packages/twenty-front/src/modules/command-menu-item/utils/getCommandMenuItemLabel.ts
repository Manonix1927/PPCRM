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

export const getCommandMenuItemLabel = (
  label: Nullable<string | MessageDescriptor>,
): string => {
  if (!isDefined(label)) {
    return '';
  }

  if (!isString(label)) {
    return i18n._(label);
  }

  // Try direct lookup by msgid first (works for fully static labels).
  const translated = i18n._(label);
  if (translated !== label) {
    return translated;
  }

  // Handle server-provided template strings like: "Export <ObjectLabelPlural>".
  for (const prefix of TEMPLATE_PREFIXES) {
    const prefixWithSpace = `${prefix} `;
    if (label.startsWith(prefixWithSpace)) {
      const rest = label.slice(prefixWithSpace.length);
      const translatedPrefix = i18n._(prefix);
      return `${translatedPrefix} ${rest}`;
    }
  }

  return label;
};
