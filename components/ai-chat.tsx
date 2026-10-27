"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  X,
  Send,
  History,
  Copy,
  Loader2,
  RotateCcw,
  Download,
  Type,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  language?: "en" | "ar";
  model?: string;
  citations?: Array<{ title: string; url: string }>;
};

const STORAGE_KEY = "devops-guide:ai-chat";

const DEFAULT_MESSAGES: Message[] = [
  {
    id: "msg_0",
    role: "assistant",
    content:
      "Hi! I'm the Codefyhub DevOps Guide assistant. I have full knowledge of the project's 12 sections, 62 articles, and all technical documentation. Ask me about infrastructure, storage, networking, CI/CD, security, or operations.\n\nمرحبًا! أنا مساعد Codefyhub لدليل DevOps. لدي معرفة كاملة بأقسام المشروع الـ 12، و62 مقالة، وجميع التوثيق التقني. اسألني عن البنية التحتية، التخزين، الشبكات، تكامل النشر والتطوير المستمر، الأمن، أو العمليات.",
    language: "en",
  },
];

function isArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function formatTime(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function genId(): string {
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

// ── Code block renderer ──────────────────────────────────────────────────────

type CodeBlockPart = { type: "text"; content: string } | { type: "code"; lang: string; code: string };

function parseCodeBlocks(content: string): CodeBlockPart[] {
  const parts: CodeBlockPart[] = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "code", lang: match[1] || "text", code: match[2] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", content: content.slice(lastIndex) });
  }

  return parts;
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-border/40 bg-[var(--bg)] shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-bg/50 text-[10px] font-mono text-muted/60 uppercase tracking-wider">
        <span>{lang}</span>
        <button
          onClick={handleCopy}
          className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
            copied ? "bg-accent text-bg" : "bg-bg/60 hover:bg-accent/10 text-muted/60 hover:text-accent"
          }`}
          title={copied ? "Copied!" : "Copy code"}
          aria-label={copied ? "Copied!" : "Copy code"}
        >
          {copied ? (
            <span className="text-[10px]">✓</span>
          ) : (
            <Copy className="w-3 h-3" aria-hidden="true" />
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto font-mono text-sm text-text leading-relaxed"><code>{code}</code></pre>
    </div>
  );
}

function renderMessageContent(content: string, isStreaming: boolean) {
  const parts = parseCodeBlocks(content);
  return (
    <>
      {parts.map((part, i) => {
        if (part.type === "code") {
          return <CodeBlock key={i} lang={part.lang} code={part.code} />;
        }
        return (
          <div key={i} className="text-inherit leading-relaxed whitespace-pre-wrap break-words">
            {part.content}
            {isStreaming && <span className="text-accent">█</span>}
          </div>
        );
      })}
    </>
  );
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
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingMessageId, setStreamingMessageId] = useState("");
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);
  const [quickActionTargetId, setQuickActionTargetId] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [feedbackState, setFeedbackState] = useState<Record<string, "up" | "down">>({});
  const [selectedModel, setSelectedModel] = useState("openrouter/free");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore storage errors
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, streaming]);

  const clearChat = useCallback(() => {
    setMessages([DEFAULT_MESSAGES[0]]);
    setServerError(null);
    setDetectedLanguage(null);
    setStreaming(false);
    setStreamingContent("");
    setStreamingMessageId("");
  }, []);

  const handleExport = useCallback(() => {
    const markdown = messages
      .map((m) => {
        const langLabel = m.language === "ar" ? "العربية" : "English";
        const time = formatTime();
        return `### ${m.role === "user" ? "You" : "Codefyhub AI"} (${langLabel}) — ${time}\n\n${m.content}\n`;
      })
      .join("\n---\n\n");

    const blob = new Blob([`# Codefyhub AI Chat Export\n\n---\n\n${markdown}`], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `codefyhub-ai-chat-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportDialog(false);
  }, [messages]);

  const copyMessage = useCallback(
    (content: string, citations?: Array<{ title: string; url: string }>) => {
      let text = content;
      if (citations && citations.length > 0) {
        text += "\n\n---\nSources:\n" + citations.map((c) => `- ${c.title}: ${c.url}`).join("\n");
      }
      navigator.clipboard.writeText(text);
    },
    []
  );

  const handleFeedback = useCallback(
    async (messageId: string, rating: "up" | "down") => {
      setFeedbackState((prev) => ({ ...prev, [messageId]: rating }));

      try {
        await fetch("/api/chat/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, rating }),
        });
      } catch {
        // Best-effort — revert on failure
        setFeedbackState((prev) => {
          const next = { ...prev };
          delete next[messageId];
          return next;
        });
      }
    },
    []
  );

  const handleRegenerate = useCallback(() => {
    const lastUserIdx = messages
      .map((m) => m.role)
      .lastIndexOf("user");
    if (lastUserIdx === -1) return;

    const userMessage = messages[lastUserIdx];
    // Remove all messages after the last user message
    setMessages((prev) => prev.slice(0, lastUserIdx + 1));
    setServerError(null);
    setStreaming(false);
    setStreamingContent("");
    setStreamingMessageId("");

    // Resend the user message
    const text = userMessage.content.trim();
    if (!text) return;

    const userLang = isArabic(text) ? "ar" : "en";
    setDetectedLanguage(userLang);

    setIsLoading(true);
    setStreaming(streamingEnabled);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const userMsgId = genId();
    setMessages((prev) => [...prev, { ...userMessage, id: userMsgId }]);

    const assistantMsgId = genId();
    setMessages((prev) => [...prev, { id: assistantMsgId, role: "assistant", content: "", language: userLang }]);
    setStreamingMessageId(assistantMsgId);
    setStreamingContent("");

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [...messages.slice(0, lastUserIdx + 1), { ...userMessage, id: userMsgId }],
        language: detectedLanguage ?? userLang,
        stream: streamingEnabled,
        model: selectedModel,
      }),
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }

        if (streamingEnabled && response.body) {
          // Consume SSE stream
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (!abortController.signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop()!;

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const dataStr = trimmed.slice(5).trim();
              if (dataStr === "[DONE]") {
                setStreaming(false);
                setStreamingContent("");
                setStreamingMessageId("");
                setIsLoading(false);
                abortControllerRef.current = null;
                return;
              }
              try {
                const data = JSON.parse(dataStr);
                const content = data.choices?.[0]?.delta?.content;
                if (content) {
                  setStreamingContent((prev) => prev + content);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId ? { ...m, content: prev.filter((mm) => mm.id === assistantMsgId)[0]!.content + content } : m
                    )
                  );
                }
              } catch {
                // Skip malformed chunks
              }
            }
          }
        } else {
          const body = await response.json();
          const assistantMsg = {
            id: assistantMsgId,
            role: "assistant" as const,
            content: body.content ?? "No response received.",
            language: body.language ?? userLang,
            model: body.model,
          };
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? assistantMsg : m))
          );
          setStreaming(false);
          setStreamingContent("");
          setStreamingMessageId("");
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "Unknown error";
        setServerError(message);
        setIsLoading(false);
        setStreaming(false);
        setStreamingContent("");
        setStreamingMessageId("");
      });
  }, [messages, detectedLanguage, streamingEnabled, selectedModel]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading || streaming) return;

    const userLang = isArabic(text) ? "ar" : "en";
    setDetectedLanguage(userLang);

    const userMsgId = genId();
    const userMsg: Message = { id: userMsgId, role: "user", content: text, language: userLang };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setStreaming(streamingEnabled);
    setServerError(null);

    const assistantMsgId = genId();
    setMessages((prev) => [...prev, { id: assistantMsgId, role: "assistant", content: "", language: userLang }]);
    setStreamingMessageId(assistantMsgId);
    setStreamingContent("");

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          language: detectedLanguage ?? userLang,
          stream: streamingEnabled,
          model: selectedModel,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? `Server returned ${response.status}`);
      }

      if (streamingEnabled && response.body) {
        // Consume SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!abortController.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop()!;

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const dataStr = trimmed.slice(5).trim();
            if (dataStr === "[DONE]") {
              setStreaming(false);
              setStreamingContent("");
              setStreamingMessageId("");
              setIsLoading(false);
              abortControllerRef.current = null;
              return;
            }
            try {
              const data = JSON.parse(dataStr);
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                setStreamingContent((prev) => prev + content);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: (prev.find((mm) => mm.id === assistantMsgId)?.content ?? "") + content }
                      : m
                  )
                );
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }
      } else {
        const body = await response.json();
        const assistantMsg: Message = {
          id: assistantMsgId,
          role: "assistant",
          content: body.content ?? "No response received.",
          language: body.language ?? userLang,
          model: body.model,
        };
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? assistantMsg : m))
        );
        setStreaming(false);
        setStreamingContent("");
        setStreamingMessageId("");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Unknown error";
      setServerError(message);
      setMessages((prev) =>
        prev.filter((m) => m.id !== assistantMsgId)
      );
      setStreamingMessageId("");
    } finally {
      if (!streaming) {
        setIsLoading(false);
      }
      abortControllerRef.current = null;
    }
  }

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStreaming(false);
    setStreamingContent("");
    setIsLoading(false);
    abortControllerRef.current = null;
  }, []);

  const handleQuickAction = useCallback((action: "explain" | "commands" | "translate") => {
    const targetMsg = messages.find((m) => m.id === quickActionTargetId);
    if (!targetMsg || targetMsg.role !== "assistant") return;

    let prompt = "";
    switch (action) {
      case "explain":
        prompt = `Explain this in simpler terms: "${targetMsg.content.slice(0, 200)}"`;
        break;
      case "commands":
        prompt = `Extract all commands from this response and present them as copyable code blocks: "${targetMsg.content.slice(0, 200)}"`;
        break;
      case "translate":
        prompt = `Translate this response to ${detectedLanguage === "ar" ? "English" : "Arabic"}: "${targetMsg.content.slice(0, 200)}"`;
        break;
    }

    setQuickActionsVisible(false);
    setQuickActionTargetId(null);

    const userMsgId = genId();
    const userMsg: Message = { id: userMsgId, role: "user", content: prompt, language: detectedLanguage ?? "en" };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setStreaming(streamingEnabled);

    const assistantMsgId = genId();
    setMessages((prev) => [...prev, { id: assistantMsgId, role: "assistant", content: "", language: detectedLanguage ?? "en" }]);
    setStreamingMessageId(assistantMsgId);
    setStreamingContent("");

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [...messages, userMsg],
        language: detectedLanguage ?? "en",
        stream: streamingEnabled,
        model: selectedModel,
      }),
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
        if (streamingEnabled && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          while (!abortController.signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop()!;
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const dataStr = trimmed.slice(5).trim();
              if (dataStr === "[DONE]") {
                setStreaming(false);
                setStreamingContent("");
                setStreamingMessageId("");
                setIsLoading(false);
                return;
              }
              try {
                const data = JSON.parse(dataStr);
                const content = data.choices?.[0]?.delta?.content;
                if (content) {
                  setStreamingContent((prev) => prev + content);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, content: (prev.find((mm) => mm.id === assistantMsgId)?.content ?? "") + content }
                        : m
                    )
                  );
                }
              } catch {}
            }
          }
        } else {
          const body = await response.json();
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: body.content ?? "No response received.", language: body.language ?? "en", model: body.model }
                : m
            )
          );
          setStreaming(false);
          setStreamingContent("");
          setStreamingMessageId("");
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setServerError(err instanceof Error ? err.message : "Unknown error");
        setIsLoading(false);
        setStreaming(false);
      });
  }, [messages, quickActionTargetId, detectedLanguage, streamingEnabled, selectedModel]);

  const isRtl = detectedLanguage === "ar";

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
        className={`fixed ${
          isRtl ? "bottom-6 left-6" : "bottom-6 right-6"
        } z-[70] pointer-events-auto flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-accent via-accent/90 to-accent/70 text-bg shadow-[0_0_30px_rgba(77,226,189,0.6)] hover:shadow-[0_0_50px_rgba(77,226,189,0.9)] hover:scale-105 active:scale-95 transition-all duration-300 border border-accent/50`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
        type="button"
      >
        <div className="relative flex items-center justify-center">
          <Bot className="w-5 h-5 text-bg" aria-hidden="true" />
          <div className="absolute -right-1 -bottom-1 w-3 h-3 rounded-full bg-red-500 border-3 border-bg animate-pulse" />
        </div>
      </button>

      {/* Modern glassmorphism chat popup */}
      {isOpen && (
        <div
          className={`fixed bottom-16 ${
            isRtl ? "left-6" : "right-6"
          } z-50 w-96 max-w-[92vw] h-[80vh] rounded-2xl border border-accent/20 bg-bg/80 backdrop-blur-xl shadow-2xl shadow-accent/10 overflow-hidden flex flex-col transition-all duration-300 ${
            detectedLanguage === "ar" ? "rtl" : "ltr"
          }`}
          dir={detectedLanguage === "ar" ? "rtl" : "ltr"}
        >
          <div className="animate-[slideUp_0.5s_cubic-bezier(0.16,1,0.3,1)] flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-accent/30 bg-bg/60 backdrop-blur-xl rounded-t-2xl flex-shrink-0 relative overflow-hidden">
              <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-accent to-transparent opacity-70" />
              
              <div className="flex items-center gap-4 relative z-10">
                {/* AI Avatar */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent via-accent/80 to-accent/60 flex items-center justify-center shadow-[0_0_20px_rgba(77,226,189,0.3)] border border-accent/40">
                    <Bot className="w-5 h-5 text-bg" aria-hidden="true" />
                  </div>
                  {/* Status indicator */}
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-bg ${
                    streaming ? "bg-red-500 animate-pulse" : "bg-accent"
                  }`} aria-label={streaming ? "AI thinking" : "AI online"} />
                </div>
                
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-text leading-tight">Codefyhub AI</span>
                    {streaming && (
                      <span className="w-2 h-2 rounded-full bg-accent animate-pulse" aria-label="AI thinking" />
                    )}
                  </div>
                  <span className="text-[10px] text-accent/70 font-medium block mt-0.5 tracking-wider uppercase">
                    DevOps Assistant
                  </span>
                  <span className="text-[9px] text-muted/50 block mt-0.5">
                    {streaming ? "Thinking…" : "RAG enabled · 62 articles"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 relative z-10">
                {/* Model pill selector */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-bg/60 border border-accent/20 backdrop-blur-xl shadow-sm">
                  <span className="text-[9px] font-medium text-muted/60 uppercase tracking-tighter">Model</span>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="text-[10px] bg-transparent border-none text-text cursor-pointer focus:outline-none focus:ring-0 hover:text-accent transition-colors appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%234de2bd%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%3E%3C/polyline%3E%3C/svg%22)] no-repeat right-1.5 center' pr-6]"
                    title="Select AI model"
                    aria-label="Select AI model"
                  >
                    <option value="openrouter/free">Auto</option>
                    <option value="meta-llama/llama-3.1-8b-instruct:free">Llama 3.1</option>
                    <option value="microsoft/phi-3-mini-128k-instruct:free">Phi-3</option>
                    <option value="qwen/qwen-2.5-7b-instruct:free">Qwen 2.5</option>
                    <option value="google/gemma-2-9b-it:free">Gemma 2</option>
                  </select>
                </div>
                
                {/* Language badge */}
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border uppercase tracking-tighter ${
                  detectedLanguage === "ar"
                    ? "border-accent/30 bg-accent/5 text-accent shadow-[0_0_10px_rgba(77,226,189,0.2)]"
                    : "border-border/30 bg-bg/5 text-muted/80"
                }`}>
                  {detectedLanguage === "ar" ? "العربية" : "English"}
                </span>
                
                {/* Action buttons group */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowExportDialog(true)}
                    className="w-9 h-9 rounded-xl bg-bg/50 border border-border/40 text-muted/60 hover:bg-accent/5 hover:text-accent hover:border-accent/40 hover:shadow-[0_0_12px_rgba(77,226,189,0.15)] active:scale-90 transition-all duration-200 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1"
                    title="Export conversation"
                    aria-label="Export conversation"
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    onClick={clearChat}
                    className="w-9 h-9 rounded-xl bg-bg/50 border border-border/40 text-muted/60 hover:bg-red-500/5 hover:text-red-500 hover:border-red-500/30 hover:shadow-[0_0_12px_rgba(239,68,68,0.1)] active:scale-90 transition-all duration-200 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-1"
                    title="Clear conversation"
                    aria-label="Clear chat"
                  >
                    <History className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] active:scale-90 transition-all duration-200 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-1"
                    aria-label="Close chat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages - THE SCROLLABLE AREA */}
            <div className="flex-1 min-h-[0px] overflow-y-auto p-5 space-y-4 custom-scrollbar overflow-scroll">
              {messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                const isArabicMsg = msg.language === "ar" || (msg.role === "user" && isArabic(msg.content));
                const msgDir = isArabicMsg ? "rtl" : "ltr";
                const isStreaming = streaming && msg.id === streamingMessageId;
                const displayContent = isStreaming ? streamingContent : msg.content;

                return (
                  <div
                    key={msg.id}
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
                        {isStreaming && (
                          <span className="text-[10px] text-accent animate-pulse">● Streaming</span>
                        )}
                      </div>
                      <div className="text-inherit leading-relaxed break-words">
                        {renderMessageContent(displayContent, isStreaming)}
                      </div>
                      {msg.model && (
                        <span className="text-[9px] text-muted/40 mt-1 block">Model: {msg.model}</span>
                      )}
                      <div className="flex justify-end mt-2.5 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => copyMessage(msg.content, msg.citations)}
                          className="w-8 h-8 rounded-xl bg-bg/50 border border-border/40 text-muted/50 hover:bg-accent/10 hover:text-accent hover:border-accent/30 active:scale-90 transition-all duration-200 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Copy message"
                          aria-label="Copy message"
                          disabled={isStreaming}
                        >
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        {!isUser && !isStreaming && (
                          <button
                            onClick={() => {
                              setQuickActionTargetId(msg.id);
                              setQuickActionsVisible(true);
                            }}
                            className="w-8 h-8 rounded-xl bg-bg/50 border border-border/40 text-muted/50 hover:bg-accent/10 hover:text-accent hover:border-accent/30 active:scale-90 transition-all duration-200 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1"
                            title="Quick actions"
                            aria-label="Quick actions"
                          >
                            <Type className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                        {!isUser && !isStreaming && (
                          <button
                            onClick={handleRegenerate}
                            className="w-8 h-8 rounded-xl bg-bg/50 border border-border/40 text-muted/50 hover:bg-accent/10 hover:text-accent hover:border-accent/30 active:scale-90 transition-all duration-200 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Regenerate response"
                            aria-label="Regenerate response"
                            disabled={isLoading}
                          >
                            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                        {!isUser && !isStreaming && (
                          <button
                            onClick={() => handleFeedback(msg.id, "up")}
                            className={`w-8 h-8 rounded-xl bg-bg/50 border border-border/40 text-muted/50 hover:bg-accent/10 hover:text-accent hover:border-accent/30 active:scale-90 transition-all duration-200 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                              feedbackState[msg.id] === "up" ? "bg-accent/20 text-accent border-accent/40" : ""
                            }`}
                            title="Helpful"
                            aria-label="Helpful"
                            disabled={feedbackState[msg.id] !== undefined}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                        {!isUser && !isStreaming && (
                          <button
                            onClick={() => handleFeedback(msg.id, "down")}
                            className={`w-8 h-8 rounded-xl bg-bg/50 border border-border/40 text-muted/50 hover:bg-accent/10 hover:text-accent hover:border-accent/30 active:scale-90 transition-all duration-200 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                              feedbackState[msg.id] === "down" ? "bg-red-500/20 text-red-500 border-red-500/40" : ""
                            }`}
                            title="Not helpful"
                            aria-label="Not helpful"
                            disabled={feedbackState[msg.id] !== undefined}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {quickActionsVisible && quickActionTargetId && (
                <div className="flex gap-3 mr-auto animate-[fadeInUp_0.4s_ease-out]">
                  <div className="rounded-2xl p-4 bg-bg/60 border border-border/30 shadow-xl backdrop-blur-md">
                    <p className="text-[10px] font-semibold text-muted/60 mb-3 uppercase tracking-wider">Quick actions</p>
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => handleQuickAction("explain")}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-bg/50 border border-border/40 text-text hover:bg-accent/5 hover:text-accent hover:border-accent/30 active:scale-95 transition-all duration-200"
                      >
                        <span>Explain simpler</span>
                        <span className="text-[9px] text-muted/40">AI</span>
                      </button>
                      <button
                        onClick={() => handleQuickAction("commands")}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-bg/50 border border-border/40 text-text hover:bg-accent/5 hover:text-accent hover:border-accent/30 active:scale-95 transition-all duration-200"
                      >
                        <span>Extract commands</span>
                        <span className="text-[9px] text-muted/40">Code</span>
                      </button>
                      <button
                        onClick={() => handleQuickAction("translate")}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-bg/50 border border-border/40 text-text hover:bg-accent/5 hover:text-accent hover:border-accent/30 active:scale-95 transition-all duration-200"
                      >
                        <span>Translate</span>
                        <span className="text-[9px] text-muted/40">Lang</span>
                      </button>
                      <button
                        onClick={() => setQuickActionsVisible(false)}
                        className="w-full flex items-center justify-center px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 hover:border-red-500/50 active:scale-95 transition-all duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isLoading && !streaming && (
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

              {streaming && (
                <div className="flex gap-3 mr-auto animate-[fadeInUp_0.4s_ease-out]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted/60">{detectedLanguage === "ar" ? "يجري النشر..." : "Streaming response..."}</span>
                    <button
                      onClick={stopStreaming}
                      className="text-xs font-medium text-red-400 hover:text-red-300 hover:underline active:scale-95 transition-all duration-200"
                      title="Stop streaming"
                    >
                      Stop
                    </button>
                  </div>
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
              <div className="flex gap-2">
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
                    disabled={isLoading || streaming}
                    dir={detectedLanguage === "ar" ? "rtl" : "ltr"}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isLoading || streaming || !input.trim()}
                  className="w-13 h-13 rounded-2xl bg-accent text-bg border border-accent/40 shadow-[0_0_20px_rgba(77,226,189,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-[0_0_30px_rgba(77,226,189,0.5)] hover:scale-105 active:scale-95 flex items-center justify-center group-hover:bg-accent/90"
                  aria-label="Send message"
                >
                  {streaming ? (
                    <X className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <Send className="w-5 h-5" aria-hidden="true" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStreamingEnabled((prev) => !prev)}
                  className="w-9 h-9 rounded-xl bg-bg/50 border border-border/40 text-muted/60 hover:bg-accent/5 hover:text-accent hover:border-accent/30 active:scale-95 transition-all duration-200 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1"
                  title={streamingEnabled ? "Disable streaming" : "Enable streaming"}
                  aria-label={streamingEnabled ? "Disable streaming" : "Enable streaming"}
                >
                  <Loader2 className={`w-4 h-4 ${streamingEnabled ? "animate-spin" : ""}`} aria-hidden="true" />
                </button>
              </div>

              <p className="text-[9px] text-muted/40 mt-2 text-center animate-pulse">
                {detectedLanguage === "ar"
                  ? "تذكّر: ردود الذكاء الاصطناعي هي اقتراحات. تحقق من الأوامر في مختبر قبل الاستخدام في الإنتاج."
                  : "AI responses are suggestions. Verify commands in a lab before production use."}
              </p>
            </div>

            {/* Export dialog */}
            {showExportDialog && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowExportDialog(false)}>
                <div className="bg-bg/95 border border-border/40 rounded-2xl p-6 shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-sm font-bold text-text mb-4">Export Conversation</h3>
                  <p className="text-xs text-muted/60 mb-4">
                    Download your chat history as a Markdown file.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExport}
                      className="flex-1 py-3 rounded-xl bg-accent text-bg font-medium hover:bg-accent/90 hover:shadow-[0_0_15px_rgba(77,226,189,0.3)] active:scale-95 transition-all duration-200"
                    >
                      Export Markdown
                    </button>
                    <button
                      onClick={() => setShowExportDialog(false)}
                      className="flex-1 py-3 rounded-xl bg-bg/50 border border-border/40 text-text hover:bg-bg/60 active:scale-95 transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
