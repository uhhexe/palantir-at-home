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

  // Initialize welcome message client-side to avoid hydration mismatch on timestamp
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "WAR ROOM INTEL system online. Upload document sets via INGEST, then query them here. I can search across all ingested documents and cite specific sources.\n\nCurrently in standby — no document sets loaded.",
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

    // Phase 2: This will call the RAG endpoint
    // For now, simulate a response
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
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="h-10 bg-surface border-b border-border flex items-center px-4 shrink-0">
        <Database className="w-3.5 h-3.5 text-accent-blue mr-2" />
        <span className="text-[11px] tracking-wider text-text-dim">
          INTEL — RAG QUERY INTERFACE
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
          <span className="text-[10px] text-warning">STANDBY</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-[12px] leading-relaxed ${
                msg.role === "user"
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "bg-surface border border-border text-text"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-border space-y-1.5">
                  <div className="text-[10px] text-text-dim tracking-wider">
                    SOURCES
                  </div>
                  {msg.sources.map((src, i) => (
                    <div
                      key={i}
                      className="text-[10px] text-accent-blue hover:text-accent cursor-pointer"
                    >
                      [{i + 1}] {src.filename}
                      {src.page ? `, p.${src.page}` : ""}
                    </div>
                  ))}
                </div>
              )}
              <div className="text-[9px] text-text-dim mt-1.5">
                {msg.timestamp.toLocaleTimeString("en-US", { hour12: false })}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-text-dim text-[11px]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Querying intelligence database...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-surface">
        <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-lg px-3 py-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Query intelligence database..."
            className="flex-1 bg-transparent text-[12px] text-text placeholder:text-text-dim outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="p-1.5 rounded hover:bg-accent/10 text-accent disabled:text-text-dim disabled:hover:bg-transparent transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
