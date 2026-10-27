import { type UIMessageChunk } from 'ai';
import { v4 } from 'uuid';

// readUIMessageStream needs start chunks that a mid-stream reconnect missed, so inject synthetic ones.
export const createMidStreamAdapter = () => {
  let hasSeenStart = false;
  const knownTextPartIds = new Set<string>();
  const knownReasoningPartIds = new Set<string>();
  const knownToolCallIds = new Set<string>();
  const knownGenericToolCallIds = new Set<string>();

  return new TransformStream<UIMessageChunk, UIMessageChunk>({
    transform(chunk, controller) {
      if (!hasSeenStart) {
        hasSeenStart = true;
        if (chunk.type !== 'start') {
          controller.enqueue({ type: 'start', messageId: v4() });
          controller.enqueue({ type: 'start-step' });
        }
      }

      if (chunk.type === 'text-start') {
        knownTextPartIds.add(chunk.id);
      } else if (
        (chunk.type === 'text-delta' || chunk.type === 'text-end') &&
        !knownTextPartIds.has(chunk.id)
      ) {
        controller.enqueue({ type: 'text-start', id: chunk.id });
        knownTextPartIds.add(chunk.id);
      }

      if (chunk.type === 'reasoning-start') {
        knownReasoningPartIds.add(chunk.id);
      } else if (
        (chunk.type === 'reasoning-delta' || chunk.type === 'reasoning-end') &&
        !knownReasoningPartIds.has(chunk.id)
      ) {
        controller.enqueue({ type: 'reasoning-start', id: chunk.id });
        knownReasoningPartIds.add(chunk.id);
      }

      if (chunk.type === 'tool-input-start') {
        knownToolCallIds.add(chunk.toolCallId);
      } else if (
        chunk.type === 'tool-input-delta' &&
        !knownToolCallIds.has(chunk.toolCallId)
      ) {
        controller.enqueue({
          type: 'tool-input-start',
          toolCallId: chunk.toolCallId,
          toolName: 'unknown',
        });
        knownToolCallIds.add(chunk.toolCallId);
      }

      // Native tools emit chunks like `tool-web_search` instead of `tool-input-*`,
      // and a mid-stream replay can start past their initialization.
      if (
        chunk.type.startsWith('tool-') &&
        chunk.type !== 'tool-input-start' &&
        chunk.type !== 'tool-input-delta' &&
        chunk.type !== 'tool-input-available' &&
        chunk.type !== 'tool-input-error'
      ) {
        const maybeToolCallId = (chunk as { toolCallId?: unknown }).toolCallId;

        if (
          typeof maybeToolCallId === 'string' &&
          maybeToolCallId.length > 0 &&
          !knownGenericToolCallIds.has(maybeToolCallId)
        ) {
          controller.enqueue({
            type: 'tool-input-start',
            toolCallId: maybeToolCallId,
            toolName: chunk.type.slice('tool-'.length).replace(/-/g, '_'),
          });
          knownGenericToolCallIds.add(maybeToolCallId);
          knownToolCallIds.add(maybeToolCallId);
        }
      }

      controller.enqueue(chunk);
    },
  });
};
