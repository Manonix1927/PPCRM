import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import {
  CallDirection,
  CallStatus,
} from 'src/objects/binotel-call.object';
import { matchCallToZayavka } from 'src/utils/match-call-to-zayavki';
import { HANDLE_WEBHOOK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

/**
 * Публичная документация Binotel описывает несколько типов событий:
 * - call_started: звонок начат (поднята трубка/пошел дозвон)
 * - call_completed / pbx_call_completed: звонок завершен
 * - voice_menu_call_started: звонок попал в голосовое меню
 * и т.п. Точный формат может отличаться от кабинета к кабинету — поэтому
 * мы опираемся на набор полей, которые стабильно присутствуют у Binotel,
 * и при отсутствии поля просто оставляем его пустым.
 *
 * Минимальный payload, который мы рассчитываем получить (частично):
 * {
 *   "event": "call_completed",
 *   "generalCallID": "string",
 *   "callType": 1 | 2,                 // 1 = incoming, 2 = outgoing
 *   "callerID": "380671234567",
 *   "calleeID": "380443334455",
 *   "startTime": 1740000000,           // unix seconds
 *   "endTime": 1740000045,
 *   "billsec": 45,
 *   "disposition": "ANSWERED" | "NO ANSWER" | "BUSY" | "FAILED",
 *   "callRecordingURL": "https://..."
 * }
 */
interface BinotelWebhookBody {
  event?: string;
  generalCallID?: string;
  callType?: number | string;
  callerID?: string;
  calleeID?: string;
  startTime?: number | string;
  endTime?: number | string;
  billsec?: number | string;
  disposition?: string;
  callRecordingURL?: string;
  [key: string]: unknown;
}

const isCompletedEvent = (event?: string): boolean => {
  if (!event) return false;
  const lower = event.toLowerCase();
  return lower.includes('complete') || lower.includes('hangup');
};

const mapDirection = (callType: unknown): CallDirection => {
  const asNumber = Number(callType);
  if (asNumber === 2) return CallDirection.OUTGOING;
  return CallDirection.INCOMING;
};

const mapStatus = (
  disposition: string | undefined,
  eventName: string | undefined,
): CallStatus => {
  if (!isCompletedEvent(eventName) && !disposition) {
    return CallStatus.IN_PROGRESS;
  }
  const normalized = (disposition ?? '').toUpperCase().replace(/\s+/g, '_');
  switch (normalized) {
    case 'ANSWERED':
      return CallStatus.ANSWERED;
    case 'NO_ANSWER':
    case 'NOANSWER':
      return CallStatus.NO_ANSWER;
    case 'BUSY':
      return CallStatus.BUSY;
    case 'FAILED':
    case 'CONGESTION':
      return CallStatus.FAILED;
    default:
      return CallStatus.IN_PROGRESS;
  }
};

const unixSecondsToIso = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null;
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber) || asNumber <= 0) return null;
  const ms = asNumber < 1e12 ? asNumber * 1000 : asNumber;
  return new Date(ms).toISOString();
};

const buildDisplayName = (
  direction: CallDirection,
  callerNumber: string,
  calleeNumber: string,
): string => {
  const arrow = direction === CallDirection.INCOMING ? '←' : '→';
  const primary =
    direction === CallDirection.INCOMING ? callerNumber : calleeNumber;
  const secondary =
    direction === CallDirection.INCOMING ? calleeNumber : callerNumber;
  return [primary, arrow, secondary].filter(Boolean).join(' ');
};

const findExistingCallByExternalId = async (
  coreClient: InstanceType<typeof CoreApiClient>,
  externalId: string,
): Promise<string | null> => {
  const result = await coreClient.query({
    binotelCalls: {
      __args: {
        filter: { externalId: { eq: externalId } },
        first: 1,
      },
      edges: {
        node: { id: true },
      },
    },
  } as any);
  return (result as any)?.binotelCalls?.edges?.[0]?.node?.id ?? null;
};

const handler = async (event: RoutePayload<BinotelWebhookBody>) => {
  const configuredSecret = process.env.BINOTEL_WEBHOOK_SECRET;
  if (configuredSecret) {
    const providedSecret =
      event.headers?.['x-binotel-secret'] ??
      event.headers?.['X-Binotel-Secret'] ??
      event.queryStringParameters?.['secret'];
    if (providedSecret !== configuredSecret) {
      console.warn('[binotel] webhook secret mismatch — отклоняем запрос');
      return { error: 'invalid secret' };
    }
  }

  const payload = event.body;
  if (!payload || typeof payload !== 'object') {
    console.warn('[binotel] пустой webhook body — пропускаем');
    return { skipped: true, reason: 'empty body' };
  }

  const externalId = String(payload.generalCallID ?? '').trim();
  if (!externalId) {
    console.warn('[binotel] payload без generalCallID — невозможно upsert');
    return { skipped: true, reason: 'missing generalCallID' };
  }

  const direction = mapDirection(payload.callType);
  const status = mapStatus(payload.disposition, payload.event);
  const callerNumber = String(payload.callerID ?? '').trim();
  const calleeNumber = String(payload.calleeID ?? '').trim();
  const startedAt = unixSecondsToIso(payload.startTime);
  const endedAt = unixSecondsToIso(payload.endTime);
  const durationSeconds = payload.billsec ? Number(payload.billsec) : null;
  const recordingUrl = payload.callRecordingURL
    ? String(payload.callRecordingURL)
    : null;

  const displayName = buildDisplayName(direction, callerNumber, calleeNumber);

  const coreClient = new CoreApiClient();
  const metadataClient = new MetadataApiClient();

  // Матчинг Заявки делаем только для завершенных звонков
  let zayavkaId: string | null = null;
  if (isCompletedEvent(payload.event)) {
    const externalPhone =
      direction === CallDirection.INCOMING ? callerNumber : calleeNumber;
    const matchResult = await matchCallToZayavka({
      rawPhone: externalPhone,
      metadataClient,
      coreClient,
    });
    zayavkaId = matchResult.zayavkaId;
  }

  const dataCommon = {
    name: displayName || externalId,
    externalId,
    direction,
    status,
    callerNumber,
    calleeNumber,
    startedAt,
    endedAt,
    durationSeconds,
    recordingUrl,
    zayavkaId,
    rawPayload: JSON.stringify(payload),
  };

  const existingId = await findExistingCallByExternalId(coreClient, externalId);

  if (existingId) {
    await coreClient.mutation({
      updateBinotelCall: {
        __args: {
          id: existingId,
          data: dataCommon,
        },
        id: true,
      },
    } as any);
    console.log(
      `[binotel] звонок обновлен id=${existingId} externalId=${externalId} event=${payload.event} zayavkaId=${zayavkaId ?? '-'}`,
    );
    return {
      processed: true,
      callId: existingId,
      action: 'updated',
      zayavkaId,
    };
  }

  const created: any = await coreClient.mutation({
    createBinotelCall: {
      __args: { data: dataCommon },
      id: true,
    },
  } as any);

  const newId = created?.createBinotelCall?.id ?? null;
  console.log(
    `[binotel] звонок создан id=${newId} externalId=${externalId} event=${payload.event} zayavkaId=${zayavkaId ?? '-'}`,
  );
  return { processed: true, callId: newId, action: 'created', zayavkaId };
};

export default defineLogicFunction({
  universalIdentifier: HANDLE_WEBHOOK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'handle-binotel-webhook',
  description:
    'Принимает webhook-события от Binotel, создает/обновляет записи звонков и автоматически привязывает их к Заявкам по номеру телефона',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: '/binotel/webhook',
    httpMethod: 'POST',
    isAuthRequired: false,
    forwardedRequestHeaders: [
      'x-binotel-secret',
      'x-binotel-event',
      'content-type',
    ],
  },
});
