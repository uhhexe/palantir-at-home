"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Database, Loader2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { filename: string; page?: number; snippet: string }[];
  timestamp: Date;
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "palantir at home INTEL system online. Upload document sets via INGEST, then query them here. I can search across all ingested documents and cite specific sources.\n\nCurrently in standby — no document sets loaded.",
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "RAG pipeline not yet connected. Upload documents via the INGEST panel, then configure your Supabase and API keys to enable document search and AI-powered analysis.",
          timestamp: new Date(),
        },
      ]);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="flex flex-col h-full bg-void">
      {/* Header */}
      <div className="h-7 bg-surface border-b border-border flex items-center px-3 shrink-0">
        <Database className="w-3 h-3 text-accent mr-1.5" />
        <span className="text-[12px] font-heading tracking-[1.5px] text-text-dim uppercase">
          Intel — RAG Query
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1 h-1 bg-warning animate-pulse" />
          <span className="text-[12px] font-mono text-warning">STANDBY</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] px-2.5 py-2 text-[13px] font-body leading-relaxed ${
                msg.role === "user"
                  ? "bg-accent-glow text-accent border border-accent/20"
                  : "bg-surface border border-border text-text"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-1.5 border-t border-border space-y-1">
                  <div className="text-[12px] font-heading tracking-[1.5px] text-text-dim uppercase">
                    Sources
                  </div>
                  {msg.sources.map((src, i) => (
                    <div
                      key={i}
                      className="text-[12px] font-mono text-accent hover:text-accent-bright cursor-pointer"
                    >
                      [{i + 1}] {src.filename}
                      {src.page ? `, p.${src.page}` : ""}
                    </div>
                  ))}
                </div>
              )}
              <div className="text-[12px] font-mono text-text-muted mt-1">
                {msg.timestamp.toLocaleTimeString("en-US", { hour12: false })}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-1.5 text-text-dim text-[12px] font-mono">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Querying intelligence database...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-2 border-t border-border bg-surface">
        <div className="flex items-center gap-1.5 bg-surface-2 border border-border px-2 py-1.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Query intelligence database..."
            className="flex-1 bg-transparent text-[13px] font-body text-text placeholder:text-text-muted outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="p-1 hover:bg-accent-glow text-accent disabled:text-text-muted transition-colors"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
