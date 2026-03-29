"use client";

interface NewsItem {
  title: string;
  link: string;
  date: string;
  description: string;
  source: string;
}

interface UkraineTimelineProps {
  news: NewsItem[];
}

const KEY_EVENTS = [
  { date: "2022-02-24T04:00:00Z", title: "Russia launches full-scale invasion of Ukraine", severity: "CRITICAL", actor: "Russia" },
  { date: "2022-04-02T00:00:00Z", title: "Bucha massacre revealed after Russian withdrawal", severity: "CRITICAL", actor: "Russia" },
  { date: "2022-08-29T00:00:00Z", title: "Kherson counter-offensive begins", severity: "HIGH", actor: "Ukraine" },
  { date: "2022-10-08T00:00:00Z", title: "Kerch Strait Bridge struck by truck bomb", severity: "HIGH", actor: "Ukraine" },
  { date: "2022-11-11T00:00:00Z", title: "Kherson city liberated", severity: "HIGH", actor: "Ukraine" },
  { date: "2023-06-06T00:00:00Z", title: "Kakhovka Dam destroyed — massive flooding", severity: "CRITICAL", actor: "Russia" },
  { date: "2023-06-08T00:00:00Z", title: "Summer counter-offensive begins", severity: "HIGH", actor: "Ukraine" },
  { date: "2023-05-21T00:00:00Z", title: "Bakhmut falls after months of fighting", severity: "HIGH", actor: "Russia" },
  { date: "2024-02-17T00:00:00Z", title: "Avdiivka falls to Russian forces", severity: "HIGH", actor: "Russia" },
  { date: "2024-08-06T00:00:00Z", title: "Ukraine launches Kursk incursion into Russia", severity: "CRITICAL", actor: "Ukraine" },
  { date: "2024-11-19T00:00:00Z", title: "First ATACMS strike deep into Russia", severity: "HIGH", actor: "Ukraine" },
  { date: "2025-01-20T00:00:00Z", title: "Trump inaugurated — aid uncertainty grows", severity: "MEDIUM", actor: "Diplomacy" },
  { date: "2025-06-15T00:00:00Z", title: "F-16 operations confirmed from UA bases", severity: "HIGH", actor: "Ukraine" },
  { date: "2025-09-01T00:00:00Z", title: "Drone war escalation — record monthly UAV losses", severity: "HIGH", actor: "Both" },
  { date: "2026-01-15T00:00:00Z", title: "Russia intensifies Donetsk push toward Pokrovsk", severity: "HIGH", actor: "Russia" },
];

const ACTOR_COLORS: Record<string, string> = {
  Ukraine: "#005BBB",
  Russia: "#e8364a",
  Both: "#d4962a",
  Diplomacy: "#00d4aa",
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#e8364a",
  HIGH: "#d4962a",
  MEDIUM: "#00d4aa",
  LOW: "#8b949e",
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

export default function UkraineTimeline({ news }: UkraineTimelineProps) {
  const combined = [
    ...KEY_EVENTS.map((e, i) => ({
      key: `evt-${i}`,
      date: e.date,
      title: e.title,
      detail: "",
      actor: e.actor,
      severity: e.severity,
      type: "event" as const,
      link: "",
    })),
    ...news.map((n, i) => ({
      key: `news-${i}`,
      date: n.date,
      title: n.title,
      detail: n.description,
      actor: n.source,
      severity: "LOW",
      type: "news" as const,
      link: n.link,
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
        {combined.slice(0, 100).map((item) => {
          const inner = (
            <>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-mono text-[14px] text-text-muted">
                  {formatDate(item.date)}
                </span>
                {item.type === "event" && (
                  <span
                    className="w-1 h-1"
                    style={{ backgroundColor: SEVERITY_COLORS[item.severity] || "#8b949e" }}
                  />
                )}
              </div>
              <div className="flex items-start gap-1.5">
                <span
                  className="font-mono text-[14px] font-bold shrink-0 mt-0.5"
                  style={{ color: item.type === "news" ? "#8b949e" : (ACTOR_COLORS[item.actor] || "#8b949e") }}
                >
                  {item.type === "news" ? `[${item.actor}]` : item.actor}
                </span>
                <span className="font-body text-[16px] text-text leading-tight">
                  {item.title}
                </span>
              </div>
            </>
          );

          if (item.type === "news" && item.link) {
            return (
              <a
                key={item.key}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 border-b border-border hover:bg-surface-2 transition-colors"
              >
                {inner}
              </a>
            );
          }

          return (
            <div
              key={item.key}
              className="px-3 py-2 border-b border-border hover:bg-surface-2 transition-colors"
            >
              {inner}
            </div>
          );
        })}
        {combined.length === 0 && (
          <div className="px-3 py-6 text-center font-mono text-[15px] text-text-muted">
            Loading timeline...
          </div>
        )}
      </div>
    </div>
  );
}
