import { describe, expect, it, vi } from "vitest";
import { createChatStream } from "./ai-stream";

function setup(body: ReadableStream<Uint8Array>, signal = new AbortController().signal) {
  const complete = vi.fn(async () => {});
  const fail = vi.fn(async () => {});
  const abort = vi.fn();
  return { stream: createChatStream(body, { signal, complete, fail, abort }), complete, fail, abort };
}

describe("AI streaming lifecycle", () => {
  it("streams byte chunks across split UTF-8/SSE frames and records final usage", async () => {
    const bytes = new TextEncoder().encode('data: {"choices":[{"delta":{"content":"مرحبا"}}]}\n\ndata: {"usage":{"prompt_tokens":12,"completion_tokens":4}}\n\ndata: [DONE]');
    let offset = 0;
    const body = new ReadableStream<Uint8Array>({ pull(controller) {
      if (offset === bytes.length) { controller.close(); return; }
      controller.enqueue(bytes.slice(offset, offset + 3)); offset = Math.min(offset + 3, bytes.length);
    } });
    const { stream, complete, fail } = setup(body);
    expect(complete).not.toHaveBeenCalled();
    const result = await new Response(stream).text();
    expect(result).toContain("مرحبا");
    expect(result).toContain("data: [DONE]");
    expect(complete).toHaveBeenCalledExactlyOnceWith({ tokensIn: 12, tokensOut: 4 });
    expect(fail).not.toHaveBeenCalled();
  });
  it("records truncated responses as failures", async () => {
    const body = new ReadableStream<Uint8Array>({ start(controller) { controller.close(); } });
    const { stream, complete, fail } = setup(body);
    await expect(new Response(stream).text()).rejects.toThrow("completion marker");
    expect(complete).not.toHaveBeenCalled();
    expect(fail).toHaveBeenCalledOnce();
  });
  it("aborts a stalled body after the response headers", async () => {
    const controller = new AbortController();
    const cancel = vi.fn();
    const { stream, complete, fail } = setup(new ReadableStream({ cancel }), controller.signal);
    const result = new Response(stream).text();
    controller.abort(new Error("deadline exceeded"));
    await expect(result).rejects.toThrow("deadline exceeded");
    expect(cancel).toHaveBeenCalledOnce();
    expect(complete).not.toHaveBeenCalled();
    expect(fail).toHaveBeenCalledOnce();
  });
  it("cancels the upstream when the client disconnects", async () => {
    const cancel = vi.fn();
    const { stream, abort, complete, fail } = setup(new ReadableStream({ cancel }));
    await stream.cancel("client disconnected");
    expect(cancel).toHaveBeenCalledOnce();
    expect(abort).toHaveBeenCalledOnce();
    expect(complete).not.toHaveBeenCalled();
    expect(fail).toHaveBeenCalledExactlyOnceWith("client disconnected", true);
  });
});
