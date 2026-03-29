"use client";

import { useEffect, useRef, useState } from "react";

interface NewsItem {
  title: string;
  link: string;
  source: string;
}

interface UkraineNewsBarProps {
  news: NewsItem[];
  warDay: number;
}

export default function UkraineNewsBar({ news, warDay }: UkraineNewsBarProps) {
  const [offset, setOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (news.length === 0) return;
    const id = setInterval(() => setOffset((prev) => prev + 1), 50);
    return () => clearInterval(id);
  }, [news.length]);

  const tickerText = news.map((n) => `[${n.source}] ${n.title}`).join("  \u2014\u2014\u2014  ");

  return (
    <div className="h-[28px] bg-surface border-t border-border flex items-center shrink-0 overflow-hidden select-none">
      {/* Left badge */}
      <div
        className="flex items-center gap-1.5 px-3 h-full border-r border-border shrink-0"
        style={{ fontFamily: "'Inconsolata', monospace", fontSize: "11px" }}
      >
        <div className="w-1 h-1 bg-danger animate-pulse" />
        <span className="text-danger tracking-[1px]">LIVE</span>
        <span className="text-text-muted">|</span>
        <span className="text-text-dim">D+{warDay}</span>
      </div>

      {/* Scrolling ticker */}
      <div className="flex-1 overflow-hidden relative">
        <div
          ref={scrollRef}
          className="whitespace-nowrap font-mono text-[15px] text-text-dim absolute"
          style={{ transform: `translateX(-${offset}px)` }}
        >
          {tickerText || "Fetching intelligence feeds..."}
          {"  \u2014\u2014\u2014  "}
          {tickerText}
        </div>
      </div>

      {/* Right: source */}
      <div
        className="px-3 h-full flex items-center border-l border-border shrink-0"
        style={{ fontFamily: "'Inconsolata', monospace", fontSize: "9px", color: "#7d8590", letterSpacing: "0.5px" }}
      >
        UKRINFORM / PRAVDA / BBC / NYT
      </div>
    </div>
  );
}
