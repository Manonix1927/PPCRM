/*
 * Re-applies fork-only translations that upstream does not know about.
 *
 * Why this exists:
 *   Some features in this fork add strings that don't exist upstream (e.g. the
 *   custom date-filter operands: yesterday/tomorrow/this-last-next week and
 *   "next business day"). Every time we merge upstream, the Lingui catalogs are
 *   overwritten with upstream's versions and these translations are lost, so the
 *   UI falls back to raw message-id hashes (e.g. "J2StrG") or English.
 *
 * What it does (idempotent):
 *   1. For every locale below, fills/repairs the msgstr of the listed msgids.
 *   2. Strips stray NUL bytes that previous manual edits left in some catalogs.
 *
 * Usage:
 *   Run AFTER `lingui extract` (so the msgids exist) and BEFORE `lingui compile`:
 *     npx nx run twenty-front:lingui:sync-custom
 *   or manually from packages/twenty-front:
 *     npx lingui extract && node scripts/sync-custom-translations.cjs && npx lingui compile --typescript
 *
 * To add a new fork-only string: add its msgid (exactly as it appears in en.po)
 * and the per-locale translation below, then re-run the command.
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'locales');

// msgid (must match en.po exactly) -> { locale: translation }
const TRANSLATIONS = {
  // Long labels (operand dropdown)
  'Is yesterday{timeZoneAbbreviationSuffix}': {
    'ru-RU': 'Вчера{timeZoneAbbreviationSuffix}',
    'uk-UA': 'Учора{timeZoneAbbreviationSuffix}',
  },
  'Is tomorrow{timeZoneAbbreviationSuffix}': {
    'ru-RU': 'Завтра{timeZoneAbbreviationSuffix}',
    'uk-UA': 'Завтра{timeZoneAbbreviationSuffix}',
  },
  'Is this week{timeZoneAbbreviationSuffix}': {
    'ru-RU': 'На этой неделе{timeZoneAbbreviationSuffix}',
    'uk-UA': 'Цього тижня{timeZoneAbbreviationSuffix}',
  },
  'Is last week{timeZoneAbbreviationSuffix}': {
    'ru-RU': 'На прошлой неделе{timeZoneAbbreviationSuffix}',
    'uk-UA': 'Минулого тижня{timeZoneAbbreviationSuffix}',
  },
  'Is next week{timeZoneAbbreviationSuffix}': {
    'ru-RU': 'На следующей неделе{timeZoneAbbreviationSuffix}',
    'uk-UA': 'Наступного тижня{timeZoneAbbreviationSuffix}',
  },
  'Next business day{timeZoneAbbreviationSuffix}': {
    'ru-RU': 'Следующий рабочий день{timeZoneAbbreviationSuffix}',
    'uk-UA': 'Наступний робочий день{timeZoneAbbreviationSuffix}',
  },
  // Short labels (filter chip)
  ': Yesterday{timeZoneAbbreviationSuffix}': {
    'ru-RU': ': Вчера{timeZoneAbbreviationSuffix}',
    'uk-UA': ': Учора{timeZoneAbbreviationSuffix}',
  },
  ': Tomorrow{timeZoneAbbreviationSuffix}': {
    'ru-RU': ': Завтра{timeZoneAbbreviationSuffix}',
    'uk-UA': ': Завтра{timeZoneAbbreviationSuffix}',
  },
  ': This week{timeZoneAbbreviationSuffix}': {
    'ru-RU': ': На этой неделе{timeZoneAbbreviationSuffix}',
    'uk-UA': ': Цього тижня{timeZoneAbbreviationSuffix}',
  },
  ': Last week{timeZoneAbbreviationSuffix}': {
    'ru-RU': ': На прошлой неделе{timeZoneAbbreviationSuffix}',
    'uk-UA': ': Минулого тижня{timeZoneAbbreviationSuffix}',
  },
  ': Next week{timeZoneAbbreviationSuffix}': {
    'ru-RU': ': На следующей неделе{timeZoneAbbreviationSuffix}',
    'uk-UA': ': Наступного тижня{timeZoneAbbreviationSuffix}',
  },
  ': Next business day{timeZoneAbbreviationSuffix}': {
    'ru-RU': ': Следующий рабочий день{timeZoneAbbreviationSuffix}',
    'uk-UA': ': Наступний робочий день{timeZoneAbbreviationSuffix}',
  },
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const locales = new Set();
for (const perLocale of Object.values(TRANSLATIONS)) {
  for (const locale of Object.keys(perLocale)) {
    locales.add(locale);
  }
}

let totalApplied = 0;
let totalMissing = 0;
let totalNulRemoved = 0;

for (const locale of locales) {
  const filePath = path.join(LOCALES_DIR, `${locale}.po`);

  if (!fs.existsSync(filePath)) {
    console.warn(`SKIP  ${locale}: ${filePath} not found`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let applied = 0;
  let missing = 0;

  for (const [msgid, perLocale] of Object.entries(TRANSLATIONS)) {
    const translation = perLocale[locale];

    if (translation === undefined) {
      continue;
    }

    const regex = new RegExp(
      '(msgid "' + escapeRegExp(msgid) + '"\\nmsgstr )"[^\\n]*"',
    );

    if (regex.test(content)) {
      content = content.replace(regex, '$1"' + translation + '"');
      applied += 1;
    } else {
      missing += 1;
      console.warn(`MISS  ${locale}: msgid not found -> ${msgid}`);
    }
  }

  const nulCount = (content.match(/\u0000/g) || []).length;
  if (nulCount > 0) {
    content = content.replace(/\u0000/g, '');
    totalNulRemoved += nulCount;
  }

  fs.writeFileSync(filePath, content, 'utf8');
  totalApplied += applied;
  totalMissing += missing;

  console.log(
    `OK    ${locale}: applied ${applied}, missing ${missing}, NUL removed ${nulCount}`,
  );
}

console.log(
  `\nDone. applied=${totalApplied} missing=${totalMissing} nulRemoved=${totalNulRemoved}`,
);

if (totalMissing > 0) {
  console.warn(
    '\nSome msgids were missing. Run "npx lingui extract" first so the source strings exist in the catalogs, then re-run this script.',
  );
}
