"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, X, Send, History, Monitor } from "lucide-react";

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
      {/* Animated gradient mesh background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/20 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-text/5 blur-[120px] animate-pulse" style={{ animationDelay: "2s" }}></div>
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-accent/10 blur-[80px]"></div>
      </div>

      {/* Floating toggle button */}
      <button
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-11 h-11 rounded-full bg-accent text-bg border border-accent/30 shadow-[0_0_20px_rgba(77,226,189,0.3)] hover:bg-accent/90 hover:shadow-[0_0_30px_rgba(77,226,189,0.5)] transition-all active:scale-95"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
      >
        <Bot className="w-5 h-5" aria-hidden="true" />
      </button>

      {/* Modern glassmorphism chat popup */}
      {isOpen && (
        <div className="fixed bottom-16 right-6 z-50 w-96 flex flex-col max-h-[75vh] rounded-2xl border border-accent/20 bg-bg/70 backdrop-blur-xl shadow-2xl shadow-accent/10">
          {/* Entrance animation wrapper */}
          <div className="animate-[slideUp_0.4s_ease-out]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-accent/30 bg-bg/50 backdrop-blur-sm rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center border border-accent/40 shadow-[0_0_15px_rgba(77,226,189,0.2)]">
                  <Bot className="w-4 h-4 text-accent" aria-hidden="true" />
                </div>
                <div>
                  <span className="font-bold text-sm text-text leading-tight">Codefyhub AI</span>
                  <span className="text-[10px] text-accent/60 font-medium mt-0.5 block">DevOps Assistant</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={clearChat}
                  className="w-8 h-8 rounded-lg bg-bg/40 hover:bg-accent/10 border border-accent/30 text-accent transition-all flex items-center justify-center active:scale-95"
                  title="Clear conversation"
                  aria-label="Clear chat"
                >
                  <History className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-lg bg-bg/40 hover:bg-red-500/10 border border-red-500/30 text-red-500 transition-all flex items-center justify-center active:scale-95"
                  aria-label="Close chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Model selector */}
            <div className="px-5 py-3 border-b border-accent/20 bg-bg/30">
              <div className="flex items-center gap-3">
                <Monitor className="w-3.5 h-3.5 text-accent/50" aria-hidden="true" />
                <label className="text-[10px] text-muted uppercase tracking-wider">Model</label>
                <select
                  className="flex-1 rounded-lg border border-accent/20 bg-bg/40 px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
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
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 max-w-[92%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  <div
                    className={`rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                      msg.role === "user"
                        ? "bg-accent/10 text-text border border-accent/20 shadow-[0_0_15px_rgba(77,226,189,0.15)]"
                        : "bg-bg/40 text-text border border-border/40"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 mr-auto">
                  <div className="flex flex-col gap-1.5">
                    <div className="w-20 h-2 rounded-full bg-border/30 animate-pulse" />
                    <div className="w-12 h-2 rounded-full bg-border/30 animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              )}
              {serverError && (
                <div className="flex gap-3 mr-auto">
                  <div className="rounded-2xl p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm shadow-sm">
                    {serverError}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-accent/20 bg-bg/50 backdrop-blur-sm rounded-b-2xl">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    className="w-full rounded-xl border border-accent/20 bg-bg/40 px-4 py-3 text-text placeholder-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all placeholder:text-sm"
                    placeholder="Ask about DevOps, RAID, Proxmox, WireGuard, CI/CD..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="w-12 h-12 rounded-xl bg-accent text-bg border border-accent/30 shadow-[0_0_15px_rgba(77,226,189,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_25px_rgba(77,226,189,0.4)] flex items-center justify-center active:scale-95"
                  aria-label="Send message"
                >
                  <Send className="w-5 h-5" aria-hidden="true" />
                </button>
              </form>
              <p className="text-[9px] text-muted/50 mt-2 text-center">
                AI responses are suggestions. Verify commands in a lab before production use.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
