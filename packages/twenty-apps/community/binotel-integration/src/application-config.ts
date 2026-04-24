import { defineApplication } from 'twenty-sdk/define';
import {
  APPLICATION_UNIVERSAL_IDENTIFIER,
  DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'Binotel',
  description:
    'Интеграция с телефонией Binotel. Принимает webhook-события о звонках и автоматически связывает их с Заявками по номеру телефона.',
  icon: 'IconPhone',
  defaultRoleUniversalIdentifier: DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  serverVariables: {
    BINOTEL_API_KEY: {
      description: 'API key от Binotel (company key из личного кабинета)',
      isSecret: true,
      isRequired: true,
    },
    BINOTEL_API_SECRET: {
      description: 'API secret от Binotel',
      isSecret: true,
      isRequired: true,
    },
    BINOTEL_WEBHOOK_SECRET: {
      description:
        'Опциональный секрет для валидации webhook. Если задан — webhook-события без валидного секрета будут отвергнуты.',
      isSecret: true,
      isRequired: false,
    },
  },
});
