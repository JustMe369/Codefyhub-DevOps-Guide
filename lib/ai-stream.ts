type Usage = { tokensIn: number; tokensOut: number };

// Read one upstream SSE stream with backpressure and emit byte-encoded SSE.
export function createChatStream(body: ReadableStream<Uint8Array>, options: {
  signal: AbortSignal;
  abort: () => void;
  complete: (usage: Usage) => Promise<void>;
  fail: (error: unknown, cancelled: boolean) => Promise<void>;
}) {
  const reader = body.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";
  let ended = false;
  let settled = false;
  let cancelled = false;
  const usage = { tokensIn: 0, tokensOut: 0 };
  const failure = async (error: unknown) => {
    if (settled) return;
    settled = true;
    await options.fail(error, cancelled);
  };
  const onAbort = () => { void reader.cancel(options.signal.reason).catch(() => undefined); };
  options.signal.addEventListener("abort", onAbort, { once: true });
  if (options.signal.aborted) onAbort();
  let cleaned = false;
  const cleanup = () => { if (cleaned) return; cleaned = true; options.signal.removeEventListener("abort", onAbort); reader.releaseLock(); };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (!ended) {
          options.signal.throwIfAborted();
          const { done, value } = await reader.read();
          options.signal.throwIfAborted();
          buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
          if (done && buffer && !buffer.endsWith("\n")) buffer += "\n";
          let newline: number;
          let emitted = false;
          while ((newline = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, newline).trim();
            buffer = buffer.slice(newline + 1);
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") {
              ended = true;
              settled = true;
              await options.complete(usage);
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              await reader.cancel();
              cleanup();
              return;
            }
            const data = JSON.parse(payload);
            if (data.error) throw new Error("The AI provider ended the response with an error.");
            usage.tokensIn = data.usage?.prompt_tokens ?? usage.tokensIn;
            usage.tokensOut = data.usage?.completion_tokens ?? usage.tokensOut;
            const content = data.choices?.[0]?.delta?.content;
            if (typeof content === "string" && content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
              emitted = true;
            }
          }
          if (done) throw new Error("The AI response ended before its completion marker.");
          if (emitted) return;
        }
      } catch (error) {
        ended = true;
        options.abort();
        await reader.cancel(error).catch(() => undefined);
        await failure(error);
        cleanup();
        if (!cancelled) controller.error(error);
      }
    },
    async cancel(reason) {
      cancelled = true;
      ended = true;
      options.abort();
      await reader.cancel(reason).catch(() => undefined);
      await failure(reason);
      cleanup();
    },
  });
}
