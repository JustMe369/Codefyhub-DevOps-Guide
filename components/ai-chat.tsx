"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, X, Send, History, Copy, Globe, Loader2 } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string; language?: "en" | "ar" };

const STORAGE_KEY = "devops-guide:ai-chat";

const DEFAULT_MESSAGES: Message[] = [
  {
    role: "assistant",
    content:
      "Hi! I'm the Codefyhub DevOps Guide assistant. I have full knowledge of the project's 12 sections, 62 articles, and all technical documentation. Ask me about infrastructure, storage, networking, CI/CD, security, or operations.\n\nمرحبًا! أنا مساعد Codefyhub لدليل DevOps. لدي معرفة كاملة بأقسام المشروع الـ 12، و62 مقالة، وجميع التوثيق التقني. اسألني عن البنية التحتية، التخزين، الشبكات، تكامل النشر والتطوير المستمر، الأمن، أو العمليات.",
    language: "en",
  },
];

/**
 * Detect if text contains Arabic characters
 */
function isArabic(text: string): boolean {
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(text);
}

/**
 * Format a timestamp as HH:MM
 */
function formatTime(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return DEFAULT_MESSAGES;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore storage errors
    }
    return DEFAULT_MESSAGES;
  });
  const [detectedLanguage, setDetectedLanguage] = useState<"en" | "ar" | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    setMessages([DEFAULT_MESSAGES[0]]);
    setServerError(null);
    setDetectedLanguage(null);
  }, []);

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;

    const userLang = isArabic(text) ? "ar" : "en";
    setDetectedLanguage(userLang);

    const userMsg: Message = { role: "user", content: text, language: userLang };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setServerError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          language: detectedLanguage ?? userLang,
        }),
      });

      const body = (await response.json()) as {
        content?: string;
        error?: string;
        detail?: string;
        model?: string;
        language?: "en" | "ar";
      };

      if (!response.ok) {
        throw new Error(body.error ?? `Server returned ${response.status}`);
      }

      const assistantMsg: Message = {
        role: "assistant",
        content: body.content ?? "No response received.",
        language: body.language ?? userLang,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setServerError(message);
      const errorMsg: Message = {
        role: "assistant",
        content: message,
        language: userLang,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }

  const copyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

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
        className="fixed bottom-6 right-6 z-[60] pointer-events-auto flex items-center justify-center w-12 h-12 rounded-full bg-accent text-bg border border-accent/30 shadow-[0_0_20px_rgba(77,226,189,0.4)] hover:bg-accent/90 hover:shadow-[0_0_30px_rgba(77,226,189,0.6)] transition-all duration-300 active:scale-95"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
        type="button"
      >
        <div className="relative">
          <Bot className="w-5 h-5" aria-hidden="true" />
          <div className="absolute -right-1 -bottom-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-bg animate-pulse" />
        </div>
      </button>

      {/* Modern glassmorphism chat popup */}
      {isOpen && (
        <div
          className={`fixed bottom-16 right-6 z-50 w-96 max-w-[92vw] h-[80vh] rounded-2xl border border-accent/20 bg-bg/80 backdrop-blur-xl shadow-2xl shadow-accent/10 overflow-hidden flex flex-col transition-all duration-300 ${
            detectedLanguage === "ar" ? "rtl" : "ltr"
          }`}
          dir={detectedLanguage === "ar" ? "rtl" : "ltr"}
        >
          <div className="animate-[slideUp_0.5s_cubic-bezier(0.16,1,0.3,1)] flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-accent/30 bg-bg/50 backdrop-blur-sm rounded-t-2xl flex-shrink-0 animate-[fadeInDown_0.4s_ease-out]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center border border-accent/40 shadow-[0_0_15px_rgba(77,226,189,0.2)] animate-ping">
                  <Bot className="w-4 h-4 text-accent" aria-hidden="true" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-text leading-tight">Codefyhub AI</span>
                  <span className="text-[10px] text-accent/60 font-medium block mt-0.5 animate-pulse">
                    DevOps Assistant
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Globe
                  className={`w-4 h-4 cursor-pointer hover:scale-110 transition-transform duration-200 ${
                    detectedLanguage === "ar" ? "text-accent" : "text-muted/60"
                  }`}
                  aria-label="Detected language"
                />
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                  detectedLanguage === "ar"
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-border/40 bg-bg/60 text-muted"
                }`}>
                  {detectedLanguage === "ar" ? "AR" : "EN"}
                </span>
                <button
                  onClick={clearChat}
                  className="w-9 h-9 rounded-lg bg-bg/40 hover:bg-accent/10 border border-accent/30 text-accent transition-all duration-200 flex items-center justify-center active:scale-95 group-hover:shadow-[0_0_15px_rgba(77,226,189,0.3)]"
                  title="Clear conversation"
                  aria-label="Clear chat"
                >
                  <History className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-9 h-9 rounded-lg bg-bg/40 hover:bg-red-500/10 border border-red-500/30 text-red-500 transition-all duration-200 flex items-center justify-center active:scale-95 group-hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                  aria-label="Close chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages - THE SCROLLABLE AREA */}
            <div className="flex-1 min-h-[0px] overflow-y-auto p-5 space-y-4 custom-scrollbar overflow-scroll">
              {messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                const isArabicMsg = msg.language === "ar" || (msg.role === "user" && isArabic(msg.content));
                const msgDir = isArabicMsg ? "rtl" : "ltr";
                return (
                  <div
                    key={idx}
                    className={`flex gap-3 max-w-[92%] ${
                      isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                    } animate-[fadeInUp_0.4s_ease-out]`}
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <div
                      className={`rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap shadow-sm transition-all duration-300 relative group ${
                        isUser
                          ? "bg-accent/10 text-text border border-accent/20 shadow-[0_0_15px_rgba(77,226,189,0.15)] hover:bg-accent/15"
                          : "bg-bg/40 text-text border border-border/40 hover:bg-bg/50"
                      }`}
                      dir={msgDir}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <span className={`text-[10px] font-medium uppercase tracking-wider ${
                          isArabicMsg ? "text-accent" : "text-muted/50"
                        }`}>
                          {isArabicMsg ? "العربية" : "English"}
                        </span>
                        <span className="text-[10px] text-muted/40 ml-auto">{formatTime()}</span>
                      </div>
                      <div className="text-inherit leading-relaxed whitespace-pre-wrap break-words">{msg.content}</div>
                      <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => copyMessage(msg.content)}
                          className="w-7 h-7 rounded-lg bg-bg/60 border border-border/50 text-muted/60 hover:bg-accent/10 hover:text-accent hover:border-accent/40 transition-all duration-200 flex items-center justify-center"
                          title="Copy message"
                          aria-label="Copy message"
                        >
                          <Copy className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex gap-3 mr-auto animate-[fadeInUp_0.4s_ease-out]">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted/60">
                        {detectedLanguage === "ar" ? "الذكاء الاصطناعي يفكر" : "AI is thinking"}
                      </span>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-accent animate-[bounce_0.6s_infinite]" style={{ animationDelay: "0s" }}></div>
                        <div className="w-2 h-2 rounded-full bg-accent animate-[bounce_0.6s_infinite]" style={{ animationDelay: "0.2s" }}></div>
                        <div className="w-2 h-2 rounded-full bg-accent animate-[bounce_0.6s_infinite]" style={{ animationDelay: "0.4s" }}></div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="w-20 h-1.5 rounded-full bg-border/30" />
                      <div className="w-14 h-1.5 rounded-full bg-border/30" style={{ animationDelay: "0.2s" }} />
                    </div>
                  </div>
                  <Loader2 className="w-4 h-4 text-accent animate-spin" />
                </div>
              )}
              {serverError && (
                <div className="flex gap-3 mr-auto animate-[fadeInUp_0.4s_ease-out]">
                  <div className="rounded-2xl p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm shadow-sm">
                    {serverError}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input - fixed height at bottom */}
            <div className="p-4 border-t border-accent/20 bg-bg/90 backdrop-blur-xl rounded-b-2xl flex-shrink-0 animate-[fadeInUp_0.5s_ease-out]">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                <div className="relative flex-1 group">
                  <div className="absolute inset-0 bg-gradient-to-r from-accent/20 via-transparent to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl border border-accent/40"></div>
                  <input
                    className="w-full rounded-xl border border-accent/20 bg-bg/60 px-4 py-4 text-text placeholder:text-muted/50 focus:outline-none focus:ring-0 focus:border-accent/60 focus:bg-bg/80 transition-all duration-300 selection:bg-accent/30 selection:text-text"
                    placeholder={
                      detectedLanguage === "ar"
                        ? "اسأل عن DevOps، RAID، Proxmox، WireGuard، CI/CD..."
                        : "Ask about DevOps, RAID, Proxmox, WireGuard, CI/CD..."
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                    dir={detectedLanguage === "ar" ? "rtl" : "ltr"}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="w-13 h-13 rounded-2xl bg-accent text-bg border border-accent/40 shadow-[0_0_20px_rgba(77,226,189,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-[0_0_30px_rgba(77,226,189,0.5)] hover:scale-105 active:scale-95 flex items-center justify-center group-hover:bg-accent/90"
                  aria-label="Send message"
                >
                  <Send className="w-5 h-5" aria-hidden="true" />
                </button>
              </form>
              <p className="text-[9px] text-muted/40 mt-2 text-center animate-pulse">
                {detectedLanguage === "ar"
                  ? "تذكّر: ردود الذكاء الاصطناعي هي اقتراحات. تحقق من الأوامر في مختبر قبل الاستخدام في الإنتاج."
                  : "AI responses are suggestions. Verify commands in a lab before production use."}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
