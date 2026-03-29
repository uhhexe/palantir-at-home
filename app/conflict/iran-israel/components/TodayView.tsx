"use client";

import { useMemo } from "react";

interface ConflictStrike {
  id: string;
  date: string;
  lat: number;
  lng: number;
  attacker: string;
  target: string;
  location: string;
  country: string;
  weaponType?: string | null;
  confidence: string;
  source: string;
  sourceUrl?: string;
  waveId?: string;
  notes?: string | null;
}

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

interface TodayViewProps {
  strikes: ConflictStrike[];
  events: ConflictEvent[];
  news: NewsItem[];
  conflictDay: number;
}

const ATTACKER_COLORS: Record<string, string> = {
  US: "#388bfd",
  ISRAEL: "#e6edf3",
  IRAN: "#e8364a",
  HOUTHI: "#d4962a",
  HEZBOLLAH: "#c8b832",
  UNKNOWN: "#8b949e",
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#e8364a",
  HIGH: "#d4962a",
  MEDIUM: "#00d4aa",
  LOW: "#8b949e",
};

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function TodayView({ strikes, events, news, conflictDay }: TodayViewProps) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const todayStrikes = useMemo(
    () => strikes.filter((s) => s.date?.slice(0, 10) === today),
    [strikes, today]
  );

  const recentStrikes = useMemo(
    () => strikes.filter((s) => {
      const d = s.date?.slice(0, 10);
      return d === today || d === yesterday;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [strikes, today, yesterday]
  );

  const recentEvents = useMemo(
    () => events
      .filter((e) => {
        const d = e.date?.slice(0, 10);
        return d >= yesterday;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [events, yesterday]
  );

  const todayStrikesByAttacker = useMemo(() => {
    const counts: Record<string, number> = {};
    todayStrikes.forEach((s) => {
      counts[s.attacker] = (counts[s.attacker] || 0) + 1;
    });
    return counts;
  }, [todayStrikes]);

  return (
    <div className="h-full overflow-y-auto bg-void">
      <div className="max-w-[1200px] mx-auto px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-heading text-[22px] tracking-[3px] text-accent uppercase">
              Current Day Briefing
            </div>
            <div className="font-mono text-[13px] text-text-muted mt-0.5">
              {today} — Day {conflictDay} of conflict — Iran / Israel Theater
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-danger animate-pulse" />
            <span className="font-heading text-[16px] tracking-[2px] text-danger uppercase">Live</span>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="bg-surface border border-border px-4 py-3">
            <div className="font-mono text-[13px] text-text-muted tracking-[1px] uppercase">Today&apos;s Strikes</div>
            <div className="font-mono text-[34px] text-white mt-0.5">{todayStrikes.length}</div>
            <div className="font-mono text-[13px] text-text-dim mt-0.5">
              {Object.entries(todayStrikesByAttacker).map(([k, v]) => `${k}: ${v}`).join(" / ") || "None recorded"}
            </div>
          </div>
          <div className="bg-surface border border-border px-4 py-3">
            <div className="font-mono text-[13px] text-text-muted tracking-[1px] uppercase">48h Strike Total</div>
            <div className="font-mono text-[34px] text-white mt-0.5">{recentStrikes.length}</div>
            <div className="font-mono text-[13px] text-text-dim mt-0.5">Last 2 days combined</div>
          </div>
          <div className="bg-surface border border-border px-4 py-3">
            <div className="font-mono text-[13px] text-text-muted tracking-[1px] uppercase">Live News Items</div>
            <div className="font-mono text-[34px] text-accent mt-0.5">{news.length}</div>
            <div className="font-mono text-[13px] text-text-dim mt-0.5">From intel feeds</div>
          </div>
          <div className="bg-surface border border-border px-4 py-3">
            <div className="font-mono text-[13px] text-text-muted tracking-[1px] uppercase">Conflict Day</div>
            <div className="font-mono text-[34px] text-danger mt-0.5">D+{conflictDay}</div>
            <div className="font-mono text-[13px] text-text-dim mt-0.5">Since 28 FEB 2026</div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Left column: Live Intel Feed */}
          <div className="space-y-4">
            {/* Breaking news */}
            <div className="bg-surface border border-border">
              <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                <div className="w-1 h-1 bg-danger animate-pulse" />
                <span className="font-heading text-[17px] tracking-[2px] text-accent uppercase">Live Intel Feed</span>
                <span className="font-mono text-[13px] text-text-muted ml-auto">{news.length} items</span>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                {news.length === 0 && (
                  <div className="px-4 py-6 text-center font-mono text-[13px] text-text-muted">
                    Fetching intelligence feeds...
                  </div>
                )}
                {news.slice(0, 25).map((item, i) => (
                  <a
                    key={i}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-2 border-b border-border hover:bg-surface-2 transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <div className="shrink-0 mt-1">
                        <div className="w-1 h-1 bg-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[15px] text-text leading-snug group-hover:text-accent-bright transition-colors">
                          {item.title}
                        </div>
                        {item.description && (
                          <div className="font-mono text-[13px] text-text-dim mt-0.5 line-clamp-2">
                            {item.description}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[12px] text-warning">{item.source}</span>
                          <span className="font-mono text-[12px] text-text-muted">{timeAgo(item.date)}</span>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: Strikes + Events */}
          <div className="space-y-4">
            {/* Recent strikes */}
            <div className="bg-surface border border-border">
              <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                <span className="text-danger">{"\u25C6"}</span>
                <span className="font-heading text-[17px] tracking-[2px] text-accent uppercase">Recent Strikes</span>
                <span className="font-mono text-[13px] text-text-muted ml-auto">48h window</span>
              </div>
              <div className="max-h-[280px] overflow-y-auto">
                {recentStrikes.length === 0 && (
                  <div className="px-4 py-6 text-center font-mono text-[13px] text-text-muted">
                    No strikes recorded in last 48h
                  </div>
                )}
                {recentStrikes.slice(0, 20).map((s, i) => (
                  <div key={i} className="px-4 py-1.5 border-b border-border flex items-center gap-2">
                    <div
                      className="w-2 h-2 shrink-0"
                      style={{ backgroundColor: ATTACKER_COLORS[s.attacker] || "#8b949e" }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[14px] text-text truncate">
                        {s.target || s.location}
                      </div>
                      <div className="font-mono text-[12px] text-text-muted">
                        {s.attacker} — {s.country} — {s.weaponType || "unknown"}
                      </div>
                    </div>
                    <div className="font-mono text-[12px] text-text-muted shrink-0">
                      {timeAgo(s.date)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent events */}
            <div className="bg-surface border border-border">
              <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                <span className="text-accent">{"\u25C6"}</span>
                <span className="font-heading text-[17px] tracking-[2px] text-accent uppercase">Developing Events</span>
              </div>
              <div className="max-h-[280px] overflow-y-auto">
                {recentEvents.length === 0 && events.length > 0 && (
                  <div className="px-4 py-2">
                    <div className="font-mono text-[11px] text-text-muted mb-2">No events in last 48h — showing most recent:</div>
                    {events.slice(-5).reverse().map((ev, i) => (
                      <div key={i} className="px-0 py-1.5 border-b border-border last:border-0">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-1.5 h-1.5 shrink-0"
                            style={{ backgroundColor: SEVERITY_COLORS[ev.severity] || "#8b949e" }}
                          />
                          <span className="font-mono text-[14px] text-text">{ev.title}</span>
                        </div>
                        <div className="font-mono text-[12px] text-text-dim mt-0.5 ml-3.5">
                          {ev.detail}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 ml-3.5">
                          <span className="font-mono text-[12px]" style={{ color: SEVERITY_COLORS[ev.severity] }}>{ev.severity}</span>
                          <span className="font-mono text-[12px] text-text-muted">{ev.actor} — {ev.date?.slice(0, 10)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {recentEvents.map((ev, i) => (
                  <div key={i} className="px-4 py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-1.5 h-1.5 shrink-0"
                        style={{ backgroundColor: SEVERITY_COLORS[ev.severity] || "#8b949e" }}
                      />
                      <span className="font-mono text-[14px] text-text">{ev.title}</span>
                    </div>
                    <div className="font-mono text-[12px] text-text-dim mt-0.5 ml-3.5">
                      {ev.detail}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 ml-3.5">
                      <span className="font-mono text-[12px]" style={{ color: SEVERITY_COLORS[ev.severity] }}>{ev.severity}</span>
                      <span className="font-mono text-[12px] text-text-muted">{ev.actor} — {timeAgo(ev.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
