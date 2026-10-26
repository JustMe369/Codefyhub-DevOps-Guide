"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Bot, X, Send } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm the Codefyhub DevOps Guide assistant. Ask me about infrastructure, storage, networking, CI/CD, security, or operations. I can help you find guidance in the guide.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setHasError(false);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const assistantMsg: Message = { role: "assistant", content: data.content ?? "No response received." };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setHasError(true);
      const errorMsg: Message = {
        role: "assistant",
        content: "I couldn't reach the AI assistant. Please make sure GROQ_API_KEY is configured, or try again later.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-accent text-bg border border-border hover:bg-accent-2 transition-colors"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
      >
        <Bot className="w-6 h-6" aria-hidden="true" />
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 flex flex-col rounded-xl bg-panel border border-border shadow-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-panel-2 rounded-t-xl">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-accent" aria-hidden="true" />
              <span className="font-semibold text-text">Codefyhub AI</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded p-1 hover:bg-accent-2 transition-colors"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                <div
                  className={`rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user" ? "bg-accent text-bg" : "bg-text text-bg"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 mr-auto">
                <div className="flex flex-col gap-1">
                  <div className="w-16 h-2 rounded bg-border animate-pulse" />
                  <div className="w-10 h-2 rounded bg-border animate-pulse" />
                </div>
              </div>
            )}
            {hasError && (
              <div className="text-xs text-danger animate-pulse">
                Error connecting to assistant. Check server configuration.
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-border">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-border bg-panel px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Ask about DevOps..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="rounded-lg px-3 py-2 bg-accent text-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>
            <p className="text-[10px] text-muted mt-1">
              AI responses are suggestions. Verify commands in a lab before production use.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
