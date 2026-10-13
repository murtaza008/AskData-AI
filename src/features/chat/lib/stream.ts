import type { ChatStreamEvent } from "@/lib/agent/types";

/**
 * Read the newline-delimited JSON stream from POST /api/chat, yielding each
 * event as soon as its line is complete.
 */
export async function* readChatStream(body: ReadableStream<Uint8Array>): AsyncGenerator<ChatStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });

      // A chunk may hold several lines, or end in the middle of one.
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim()) yield JSON.parse(line) as ChatStreamEvent;
      }

      if (done) {
        if (buffer.trim()) yield JSON.parse(buffer) as ChatStreamEvent;
        return;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
