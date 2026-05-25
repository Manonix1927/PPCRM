import { isNull, isNumber, isString } from '@sniptt/guards';

import { logError } from './logError';

const DEBUG_MODE = false;

export const normalizeNumberStringForParsing = (
  probableNumber: string,
): string => {
  const trimmed = probableNumber.trim();

  const lastCommaIndex = trimmed.lastIndexOf(',');
  const lastDotIndex = trimmed.lastIndexOf('.');

  let normalized = trimmed;

  if (lastCommaIndex !== -1 && lastDotIndex === -1) {
    normalized = trimmed.replace(',', '.');
  } else if (lastCommaIndex !== -1 && lastDotIndex !== -1) {
    normalized =
      lastCommaIndex > lastDotIndex
        ? trimmed.replace(/\./g, '').replace(',', '.')
        : trimmed.replace(/,/g, '');
  }

  if (normalized.endsWith('.')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
};

export const canBeCastAsNumberOrNull = (
  probableNumberOrNull: string | undefined | number | null,
): probableNumberOrNull is number | null => {
  if (probableNumberOrNull === undefined) {
    if (DEBUG_MODE) logError('probableNumberOrNull === undefined');

    return false;
  }

  if (isNumber(probableNumberOrNull)) {
    if (DEBUG_MODE) logError('typeof probableNumberOrNull === "number"');

    return true;
  }

  if (isNull(probableNumberOrNull)) {
    if (DEBUG_MODE) logError('probableNumberOrNull === null');

    return true;
  }

  if (probableNumberOrNull === '') {
    if (DEBUG_MODE) logError('probableNumberOrNull === ""');

    return true;
  }

  if (isString(probableNumberOrNull)) {
    const stringAsNumber = +normalizeNumberStringForParsing(probableNumberOrNull);

    if (isNaN(stringAsNumber)) {
      if (DEBUG_MODE) logError('isNaN(stringAsNumber)');

      return false;
    }
    if (isNumber(stringAsNumber)) {
      if (DEBUG_MODE) logError('isNumber(stringAsNumber)');

      return true;
    }
  }

  return false;
};

export const castAsNumberOrNull = (
  probableNumberOrNull: string | undefined | number | null,
): number | null => {
  if (canBeCastAsNumberOrNull(probableNumberOrNull) === false) {
    throw new Error('Cannot cast to number or null');
  }

  if (isNull(probableNumberOrNull)) {
    return null;
  }

  if (isString(probableNumberOrNull)) {
    if (probableNumberOrNull === '') {
      return null;
    }
    return +normalizeNumberStringForParsing(probableNumberOrNull);
  }

  if (isNumber(probableNumberOrNull)) {
    return probableNumberOrNull;
  }

  return null;
};
