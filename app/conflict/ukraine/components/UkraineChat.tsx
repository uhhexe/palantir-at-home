"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function UkraineChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/conflict/ukraine-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error: Could not reach analyst API." }]);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-12 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 border border-border hover:border-border-hover transition-colors"
        style={{ fontFamily: "'Inconsolata', monospace", fontSize: "11px" }}
      >
        <span className="text-accent">{"\u25C6"}</span>
        <span className="text-text-dim tracking-[1px]">AI ANALYST</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-12 right-4 z-50 w-[380px] h-[480px] bg-surface border border-border flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-accent font-heading text-[14px] tracking-[1.5px] uppercase">{"\u25C6"} AI Analyst</span>
          <span className="font-mono text-[10px] text-text-muted">UKRAINE THEATER</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-text-muted hover:text-text text-[16px] leading-none"
        >
          {"\u2715"}
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 && (
          <div className="font-mono text-[12px] text-text-muted leading-relaxed">
            Ask about the conflict: frontline status, equipment losses, strategic analysis, weapon systems, force disposition, or recent developments.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] px-2.5 py-1.5 font-mono text-[12px] leading-relaxed ${
                m.role === "user"
                  ? "bg-accent-glow text-text border border-border-active"
                  : "bg-surface-2 text-text-dim border border-border"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-2.5 py-1.5 bg-surface-2 border border-border font-mono text-[12px] text-text-muted animate-pulse">
              Analyzing...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border px-2 py-1.5 flex gap-1.5 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about the conflict..."
          className="flex-1 bg-surface-2 border border-border px-2 py-1 font-mono text-[12px] text-text placeholder:text-text-muted focus:outline-none focus:border-border-active"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-2.5 py-1 bg-accent-glow border border-border-active text-accent font-mono text-[11px] tracking-[1px] hover:bg-accent-dark disabled:opacity-30 transition-colors"
        >
          SEND
        </button>
      </div>
    </div>
  );
}
