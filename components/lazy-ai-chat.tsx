"use client";

import dynamic from "next/dynamic";
import { Bot } from "lucide-react";
import { useState } from "react";

const AIChat = dynamic(() => import("@/components/ai-chat").then((module) => module.AIChat), {
  ssr: false,
  loading: () => <span className="sr-only" role="status">Loading AI assistant</span>,
});

export function LazyAIChat() {
  const [activated, setActivated] = useState(false);
  if (activated) return <AIChat initiallyOpen />;
  return (
    <button
      className="fixed bottom-6 right-6 z-[70] flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/50 bg-gradient-to-br from-accent via-accent/90 to-accent/70 text-bg shadow-[0_14px_35px_rgba(77,226,189,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(77,226,189,0.5)] active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      type="button"
      onClick={() => setActivated(true)}
      aria-label="Open AI assistant"
    >
      <span className="relative flex items-center justify-center">
        <Bot className="h-5 w-5 text-bg" aria-hidden="true" />
        <span className="absolute -right-1 -bottom-1 h-3 w-3 rounded-full border-3 border-bg bg-red-500" aria-hidden="true" />
      </span>
    </button>
  );
}
