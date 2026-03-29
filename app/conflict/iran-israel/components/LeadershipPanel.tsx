"use client";

interface Leader {
  name: string;
  photo?: string;
  role: string;
  status: string;
  date: string | null;
  location: string;
  lat: number;
  lng: number;
  killedBy: string | null;
  details: string;
  successor?: string;
  importance: string;
}

interface LeadershipData {
  asOf: string;
  summary: {
    totalTracked: number;
    confirmed_killed: number;
    survived: number;
    fled: number;
    unknown: number;
    source: string;
  };
  succession: {
    newSupremeLeader: string;
    appointedDate: string;
    appointedBy: string;
    notes: string;
  };
  leaders: Leader[];
}

interface LeadershipPanelProps {
  data: LeadershipData;
  onSelectLeader?: (leader: Leader) => void;
}

const STATUS_COLORS: Record<string, string> = {
  ELIMINATED: "#e8364a",
  SURVIVED: "#00d4aa",
  ALIVE: "#00d4aa",
  UNKNOWN: "#d4962a",
  FLED: "#d4962a",
};

const IMPORTANCE_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const mon = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const day = d.getDate().toString().padStart(2, "0");
    return `${mon} ${day}`;
  } catch {
    return dateStr;
  }
}

function sortLeaders(leaders: Leader[]): Leader[] {
  return [...leaders].sort((a, b) => {
    // Eliminated first, then alive/survived/unknown at bottom
    const statusOrder = (s: string) => s === "ELIMINATED" ? 0 : s === "UNKNOWN" ? 1 : 2;
    const sa = statusOrder(a.status);
    const sb = statusOrder(b.status);
    if (sa !== sb) return sa - sb;
    // Within same status group, sort by importance
    const ia = IMPORTANCE_ORDER[a.importance] ?? 3;
    const ib = IMPORTANCE_ORDER[b.importance] ?? 3;
    if (ia !== ib) return ia - ib;
    // Then by date
    if (a.date && b.date) return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
  });
}

export type { Leader, LeadershipData };

export default function LeadershipPanel({ data, onSelectLeader }: LeadershipPanelProps) {
  const sorted = sortLeaders(data.leaders);
  const { summary, succession } = data;

  return (
    <div className="h-full overflow-y-auto bg-void">
      {/* Summary stats */}
      <div className="px-4 py-3 border-b border-border">
        <div className="font-heading text-[16px] tracking-[2px] text-danger uppercase flex items-center gap-1.5">
          <span className="text-danger">&#9830;</span> Leadership Status
        </div>
        <div className="grid grid-cols-3 gap-x-3 gap-y-1 mt-2">
          <div className="text-center">
            <div className="font-mono text-[28px] font-bold text-white leading-none">{summary.totalTracked}</div>
            <div className="font-mono text-[11px] text-text-muted tracking-wide">TRACKED</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-[28px] font-bold text-danger leading-none">{summary.confirmed_killed}</div>
            <div className="font-mono text-[11px] text-text-muted tracking-wide">ELIMINATED</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-[28px] font-bold text-[#d4962a] leading-none">{summary.unknown + summary.fled}</div>
            <div className="font-mono text-[11px] text-text-muted tracking-wide">UNKNOWN</div>
          </div>
        </div>
        <div className="flex justify-center gap-4 mt-1.5">
          <div className="font-mono text-[12px]">
            <span className="text-text-muted">SURVIVED: </span>
            <span className="text-accent">{summary.survived}</span>
          </div>
          <div className="font-mono text-[12px]">
            <span className="text-text-muted">FLED: </span>
            <span className="text-[#d4962a]">{summary.fled}</span>
          </div>
        </div>
      </div>

      {/* Succession */}
      <div className="px-4 py-2.5 border-b border-border bg-surface">
        <div className="font-heading text-[13px] tracking-[1.5px] text-accent uppercase">New Supreme Leader</div>
        <div className="font-heading text-[15px] text-white mt-0.5">{succession.newSupremeLeader}</div>
        <div className="font-mono text-[11px] text-text-muted mt-0.5">
          Appointed {formatDate(succession.appointedDate)} by {succession.appointedBy}
        </div>
        <div className="font-mono text-[11px] text-text-dim mt-0.5">{succession.notes}</div>
      </div>

      {/* Elimination progress bar */}
      <div className="px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[11px] text-text-muted">DECAPITATION PROGRESS</span>
          <span className="font-mono text-[11px] text-danger ml-auto">{Math.round((summary.confirmed_killed / summary.totalTracked) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-surface-2 overflow-hidden">
          <div
            className="h-full bg-danger transition-all duration-500"
            style={{ width: `${(summary.confirmed_killed / summary.totalTracked) * 100}%` }}
          />
        </div>
      </div>

      {/* Leader list */}
      <div className="divide-y divide-border/50">
        {sorted.map((leader, i) => {
          const color = STATUS_COLORS[leader.status] || "#8b949e";
          return (
            <button
              key={`${leader.name}-${i}`}
              onClick={() => onSelectLeader?.(leader)}
              className="w-full text-left px-4 py-2 hover:bg-surface-2/50 transition-colors flex items-start gap-2"
            >
              {/* Status dot */}
              <div
                className="w-[7px] h-[7px] rounded-full mt-[5px] shrink-0"
                style={{ backgroundColor: color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-heading text-[14px] text-white font-semibold truncate">
                    {leader.name}
                  </span>
                  {leader.importance === "critical" && (
                    <span className="font-mono text-[9px] text-danger border border-danger/30 px-1 shrink-0">CRITICAL</span>
                  )}
                </div>
                <div className="font-mono text-[11px] text-text-muted truncate">{leader.role}</div>
                <div className="font-mono text-[11px] flex items-center gap-1.5 mt-0.5">
                  <span style={{ color }}>{leader.status}</span>
                  {leader.date && (
                    <span className="text-text-muted">
                      {" "}&#8212; {formatDate(leader.date)}
                    </span>
                  )}
                </div>
                {leader.killedBy && (
                  <div className="font-mono text-[10px] text-text-dim mt-0.5 truncate">{leader.killedBy}</div>
                )}
                {leader.successor && (
                  <div className="font-mono text-[10px] text-accent mt-0.5 truncate">&#8594; {leader.successor}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Source */}
      <div className="px-4 py-2 border-t border-border">
        <div className="font-mono text-[10px] text-text-muted">
          Sources: {summary.source}
        </div>
        <div className="font-mono text-[10px] text-text-muted">
          As of {data.asOf}
        </div>
      </div>
    </div>
  );
}
