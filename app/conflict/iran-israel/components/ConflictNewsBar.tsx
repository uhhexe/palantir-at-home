"use client";

import { useEffect, useRef, useState } from "react";

interface NewsItem {
  title: string;
  source: string;
}

interface ConflictNewsBarProps {
  news: NewsItem[];
  conflictDay: number;
}

export default function ConflictNewsBar({ news, conflictDay }: ConflictNewsBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  // Auto-scroll
  useEffect(() => {
    if (news.length === 0) return;
    const id = setInterval(() => {
      setOffset((prev) => prev + 1);
    }, 50);
    return () => clearInterval(id);
  }, [news.length]);

  const tickerText = news.map((n) => `${n.source}: ${n.title}`).join("  ———  ");

  return (
    <div className="h-[28px] bg-surface border-t border-border flex items-center overflow-hidden shrink-0 select-none">
      {/* Left: intel badge */}
      <div className="px-3 flex items-center gap-1.5 shrink-0 border-r border-border h-full">
        <span className="text-accent">◆</span>
        <span className="font-heading text-[15px] tracking-[2px] text-text-dim uppercase">
          Intel Feed
        </span>
      </div>

      {/* Scrolling ticker */}
      <div className="flex-1 overflow-hidden relative">
        <div
          ref={scrollRef}
          className="whitespace-nowrap font-mono text-[15px] text-text-dim absolute"
          style={{ transform: `translateX(-${offset}px)` }}
        >
          {tickerText || "Fetching intelligence feeds..."}
          {"  ———  "}
          {tickerText}
        </div>
      </div>

      {/* Right: day counter */}
      <div className="px-3 flex items-center gap-2 shrink-0 border-l border-border h-full">
        <span className="font-mono text-[15px] text-text-muted">
          D+{conflictDay}
        </span>
        <div className="w-1 h-1 bg-danger animate-pulse" />
        <span className="font-heading text-[15px] tracking-[1.5px] text-danger">
          ACTIVE
        </span>
      </div>
    </div>
  );
}
