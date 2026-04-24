import { defineObject, FieldType } from 'twenty-sdk/define';
import {
  BINOTEL_CALL_OBJECT_UNIVERSAL_IDENTIFIER,
  CALLEE_NUMBER_FIELD_UNIVERSAL_IDENTIFIER,
  CALLER_NUMBER_FIELD_UNIVERSAL_IDENTIFIER,
  DIRECTION_FIELD_UNIVERSAL_IDENTIFIER,
  DURATION_SECONDS_FIELD_UNIVERSAL_IDENTIFIER,
  ENDED_AT_FIELD_UNIVERSAL_IDENTIFIER,
  EXTERNAL_ID_FIELD_UNIVERSAL_IDENTIFIER,
  NAME_FIELD_UNIVERSAL_IDENTIFIER,
  RAW_PAYLOAD_FIELD_UNIVERSAL_IDENTIFIER,
  RECORDING_URL_FIELD_UNIVERSAL_IDENTIFIER,
  STARTED_AT_FIELD_UNIVERSAL_IDENTIFIER,
  STATUS_FIELD_UNIVERSAL_IDENTIFIER,
  ZAYAVKA_ID_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export enum CallDirection {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
}

export enum CallStatus {
  ANSWERED = 'ANSWERED',
  NO_ANSWER = 'NO_ANSWER',
  BUSY = 'BUSY',
  FAILED = 'FAILED',
  IN_PROGRESS = 'IN_PROGRESS',
}

export default defineObject({
  universalIdentifier: BINOTEL_CALL_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'binotelCall',
  namePlural: 'binotelCalls',
  labelSingular: 'Звонок',
  labelPlural: 'Звонки',
  description: 'Звонок, полученный от телефонии Binotel',
  icon: 'IconPhone',
  labelIdentifierFieldMetadataUniversalIdentifier:
    NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Название',
      description:
        'Отображаемое имя звонка (формируется автоматически на основе номера и направления)',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: EXTERNAL_ID_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'externalId',
      label: 'Binotel ID',
      description:
        'Уникальный идентификатор звонка в Binotel (generalCallID). Используется для upsert.',
      icon: 'IconId',
    },
    {
      universalIdentifier: DIRECTION_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.SELECT,
      name: 'direction',
      label: 'Направление',
      description: 'Входящий или исходящий звонок',
      icon: 'IconArrowsLeftRight',
      defaultValue: `'${CallDirection.INCOMING}'`,
      options: [
        {
          id: 'f30516fd-d11c-4329-906f-48472c8563bf',
          value: CallDirection.INCOMING,
          label: 'Входящий',
          position: 0,
          color: 'green',
        },
        {
          id: '06037685-c32b-4c31-9d34-0fbd4ca53421',
          value: CallDirection.OUTGOING,
          label: 'Исходящий',
          position: 1,
          color: 'blue',
        },
      ],
    },
    {
      universalIdentifier: STATUS_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.SELECT,
      name: 'status',
      label: 'Статус',
      description: 'Результат звонка',
      icon: 'IconStatusChange',
      defaultValue: `'${CallStatus.IN_PROGRESS}'`,
      options: [
        {
          id: 'fea59919-718b-463c-ab44-e8ab70cc385f',
          value: CallStatus.IN_PROGRESS,
          label: 'В процессе',
          position: 0,
          color: 'gray',
        },
        {
          id: 'f6bdedf1-1799-497b-a5dc-583fa4867509',
          value: CallStatus.ANSWERED,
          label: 'Ответ',
          position: 1,
          color: 'green',
        },
        {
          id: '48f32050-c11f-4049-9d7f-ef0fd21f533c',
          value: CallStatus.NO_ANSWER,
          label: 'Без ответа',
          position: 2,
          color: 'red',
        },
        {
          id: 'cfd61b7e-7426-45e7-aece-d44239d71019',
          value: CallStatus.BUSY,
          label: 'Занято',
          position: 3,
          color: 'orange',
        },
        {
          id: '62d1a0bf-12c8-4740-9b48-2f0252a817e7',
          value: CallStatus.FAILED,
          label: 'Сбой',
          position: 4,
          color: 'red',
        },
      ],
    },
    {
      universalIdentifier: CALLER_NUMBER_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'callerNumber',
      label: 'Номер звонящего',
      description: 'Номер инициатора звонка',
      icon: 'IconPhoneIncoming',
    },
    {
      universalIdentifier: CALLEE_NUMBER_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'calleeNumber',
      label: 'Номер получателя',
      description: 'Номер получателя звонка',
      icon: 'IconPhoneOutgoing',
    },
    {
      universalIdentifier: STARTED_AT_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.DATE_TIME,
      name: 'startedAt',
      label: 'Начало',
      description: 'Время начала звонка',
      icon: 'IconCalendarTime',
    },
    {
      universalIdentifier: ENDED_AT_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.DATE_TIME,
      name: 'endedAt',
      label: 'Конец',
      description: 'Время завершения звонка',
      icon: 'IconCalendarTime',
    },
    {
      universalIdentifier: DURATION_SECONDS_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.NUMBER,
      name: 'durationSeconds',
      label: 'Длительность (сек)',
      description: 'Длительность разговора в секундах',
      icon: 'IconClock',
    },
    {
      universalIdentifier: RECORDING_URL_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'recordingUrl',
      label: 'Запись разговора',
      description: 'Ссылка на аудиозапись звонка в Binotel',
      icon: 'IconMicrophone',
    },
    {
      universalIdentifier: ZAYAVKA_ID_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'zayavkaId',
      label: 'ID Заявки',
      description:
        'UUID связанной Заявки. Автоматически заполняется при сопоставлении номера телефона с полями Заявки. В UI workspace создайте relation «Звонок → Заявка» с joinColumnName = zayavkaId, чтобы получить кликабельную связь.',
      icon: 'IconLink',
    },
    {
      universalIdentifier: RAW_PAYLOAD_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.RICH_TEXT,
      name: 'rawPayload',
      label: 'Raw payload',
      description:
        'Последний полученный webhook-payload от Binotel (для отладки)',
      icon: 'IconCode',
    },
  ],
});
