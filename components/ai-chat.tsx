"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, X, Send, History } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const FREE_MODELS = [
  { id: "openrouter/free", label: "Auto (Best Available)" },
  { id: "meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B" },
  { id: "microsoft/phi-3-mini-128k-instruct:free", label: "Phi-3 Mini" },
  { id: "qwen/qwen-2.5-7b-instruct:free", label: "Qwen 2.5 7B" },
  { id: "google/gemma-2-9b-it:free", label: "Gemma 2 9B" },
];

const STORAGE_KEY = "devops-guide:ai-chat";

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(FREE_MODELS[0].id);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load persisted messages from localStorage on mount
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore storage errors
    }
    return [
      {
        role: "assistant",
        content: "Hi! I'm the Codefyhub DevOps Guide assistant. I have full knowledge of the project's 12 sections, 62 articles, and all technical documentation. Ask me about infrastructure, storage, networking, CI/CD, security, or operations.",
      },
    ];
  });

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore storage errors
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const clearChat = useCallback(() => {
    setMessages([
      {
        role: "assistant",
        content: "Chat cleared. How can I help you with the Codefyhub DevOps Guide?",
      },
    ]);
    setServerError(null);
  }, []);

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setServerError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg], model: selectedModel }),
      });

      const body = (await response.json()) as {
        content?: string;
        error?: string;
        detail?: string;
        model?: string;
      };

      if (!response.ok) {
        throw new Error(body.error ?? `Server returned ${response.status}`);
      }

      const assistantMsg: Message = {
        role: "assistant",
        content: body.content ?? "No response received.",
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setServerError(message);
      const errorMsg: Message = {
        role: "assistant",
        content: message,
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
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-accent text-bg border border-border/30 hover:bg-accent-2 transition-all shadow-sm"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
      >
        <Bot className="w-5 h-5" aria-hidden="true" />
      </button>

      {/* Chat panel — clean, no background panels */}
      {isOpen && (
        <div className="fixed bottom-16 right-6 z-50 w-80 flex flex-col max-h-[60vh] rounded-lg border border-border shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden="true" />
              <span className="font-semibold text-text text-sm">Codefyhub AI</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                className="rounded p-1 hover:bg-accent-50 transition-colors text-xs text-muted"
                title="Clear conversation"
                aria-label="Clear chat"
              >
                <History className="w-3 h-3" aria-hidden="true" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded p-1 hover:bg-accent-50 transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Model selector */}
          <div className="px-4 py-2 border-b border-border/50 bg-bg/30">
            <label className="text-[10px] text-muted uppercase tracking-wider mb-1 block">LLM Model</label>
            <select
              className="w-full rounded border border-border/50 bg-transparent px-2 py-1.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {FREE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 max-w-[90%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                <div
                  className={`rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-accent/10 text-text border border-accent/30"
                      : "bg-text/5 text-text border border-border"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 mr-auto">
                <div className="flex flex-col gap-1">
                  <div className="w-16 h-2 rounded bg-border/30 animate-pulse" />
                  <div className="w-10 h-2 rounded bg-border/30 animate-pulse" />
                </div>
              </div>
            )}
            {serverError && (
              <div className="flex gap-3 mr-auto">
                <div className="rounded-lg p-3 bg-red-500/10 border border-red-500/30 text-red-500 text-sm whitespace-pre-wrap">
                  {serverError}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border/50">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-border bg-transparent px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-accent placeholder-text-muted/50"
                placeholder="Ask about DevOps, RAID, Proxmox, WireGuard, CI/CD..."
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
            <p className="text-[10px] text-muted/60 mt-1">
              AI responses are suggestions. Verify commands in a lab before production use.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
