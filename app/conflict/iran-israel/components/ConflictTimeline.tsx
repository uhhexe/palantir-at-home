"use client";

interface ConflictEvent {
  id: number;
  date: string;
  type: string;
  actor: string;
  title: string;
  detail: string;
  severity: string;
}

interface NewsItem {
  title: string;
  link: string;
  date: string;
  description: string;
  source: string;
}

interface ConflictTimelineProps {
  events: ConflictEvent[];
  news: NewsItem[];
}

const ACTOR_COLORS: Record<string, string> = {
  "US/IDF": "#388bfd",
  USA: "#388bfd",
  US: "#388bfd",
  Iran: "#e8364a",
  IRAN: "#e8364a",
  Israel: "#e6edf3",
  Houthi: "#d4962a",
  Hezbollah: "#c8b832",
  Market: "#00d4aa",
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#e8364a",
  HIGH: "#d4962a",
  MEDIUM: "#00d4aa",
  LOW: "#5c6c78",
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const mon = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const day = d.getDate().toString().padStart(2, "0");
    const h = d.getUTCHours().toString().padStart(2, "0");
    const m = d.getUTCMinutes().toString().padStart(2, "0");
    return `${mon} ${day} ${h}:${m} UTC`;
  } catch {
    return dateStr;
  }
}

export default function ConflictTimeline({ events, news }: ConflictTimelineProps) {
  // Merge events and news into one timeline
  const combined = [
    ...events.map((e) => ({
      key: `evt-${e.id}`,
      date: e.date,
      title: e.title,
      detail: e.detail,
      actor: e.actor,
      severity: e.severity,
      type: "event" as const,
    })),
    ...news.map((n, i) => ({
      key: `news-${i}`,
      date: n.date,
      title: n.title,
      detail: n.description,
      actor: n.source,
      severity: "LOW",
      type: "news" as const,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="w-[280px] bg-surface border-l border-border flex flex-col overflow-hidden shrink-0 select-none">
      <div className="px-3 py-2 border-b border-border flex items-center gap-1.5">
        <div className="w-1 h-1 bg-danger animate-pulse" />
        <span className="font-heading text-[16px] tracking-[2px] text-text-dim uppercase">
          Event Timeline
        </span>
        <span className="ml-auto font-mono text-[14px] text-text-muted">
          {combined.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {combined.slice(0, 100).map((item) => (
          <div
            key={item.key}
            className="px-3 py-2 border-b border-border hover:bg-surface-2 transition-colors"
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-mono text-[14px] text-text-muted">
                {formatDate(item.date)}
              </span>
              {item.type === "event" && (
                <span
                  className="w-1 h-1"
                  style={{ backgroundColor: SEVERITY_COLORS[item.severity] || "#5c6c78" }}
                />
              )}
            </div>
            <div className="flex items-start gap-1.5">
              <span
                className="font-mono text-[14px] font-bold shrink-0 mt-0.5"
                style={{ color: ACTOR_COLORS[item.actor] || "#5c6c78" }}
              >
                {item.type === "news" ? `[${item.actor}]` : item.actor}
              </span>
              <span className="font-body text-[16px] text-text leading-tight">
                {item.title}
              </span>
            </div>
          </div>
        ))}
        {combined.length === 0 && (
          <div className="px-3 py-6 text-center font-mono text-[15px] text-text-muted">
            Loading timeline...
          </div>
        )}
      </div>
    </div>
  );
}
