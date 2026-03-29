"use client";

interface CasualtyData {
  asOf: string;
  warStarted: string;
  dayOfWar: number;
  note: string;
  bySource: {
    alJazeera: {
      name: string;
      asOf: string;
      methodology: string;
      iran: { killed: number; injured: number | null; note: string };
      israel: { killed: number; injured: number | null };
      us_military: { killed: number; injured: number | null; note: string };
      gulf_states: { killed: number; injured: number | null; breakdown: string };
      iraq: { killed: number; injured: number | null; note: string };
      lebanon: { killed: number | null; injured: number | null; note: string };
      total: number;
    };
    hrana: {
      name: string;
      asOf: string;
      methodology: string;
      iran: {
        killed_total: number;
        killed_civilian: number;
        killed_military: number;
        killed_unclassified: number;
        injured_civilian: number;
        injured_military: number;
        children_killed: number;
        women_killed: number;
        women_injured: number;
        children_injured: number;
        provinces_hit: number;
        cities_hit: number;
        attacks_recorded: number;
      };
      note: string;
    };
    hengaw: {
      name: string;
      asOf: string;
      methodology: string;
      iran: {
        killed_total: number;
        killed_civilian: number;
        killed_military: number;
        civilian_percent: number;
        note: string;
      };
      highest_military_losses: string;
      worst_provinces: string;
    };
    iranWarLive: {
      name: string;
      asOf: string;
      methodology: string;
      all_fronts_total: number;
      note: string;
    };
    redCrescent: {
      name: string;
      asOf: string;
      methodology: string;
      iran: { killed: number; injured: number; note: string };
    };
    usIsraelClaims: {
      name: string;
      asOf: string;
      methodology: string;
      iran_military_killed: number;
      note: string;
    };
    washingtonPost: {
      name: string;
      asOf: string;
      methodology: string;
      iran_civilian_killed: number;
      note: string;
    };
  };
  usDeaths: {
    confirmed_killed: number;
    killed_by_enemy_fire: number;
    aviation_crash: number;
    health_related: number;
    total_including_accidents: number;
    source: string;
    details: string[];
  };
  israelDeaths: {
    killed: number;
    injured: string;
    source: string;
    details: string[];
  };
  gulfStateDeaths: {
    uae: { killed: number; injured: number; military_killed: number; note: string };
    saudi: { killed: number; injured: number; note: string };
    bahrain: { killed: number; injured: number | null; note: string };
    qatar: { killed: number; injured: number | null; note: string };
    kuwait: { killed: number; injured: number | null };
    jordan: { killed: number; injured: number };
  };
  notableIncidents: {
    date: string;
    event: string;
    killed: string;
    type: string;
    details: string;
    lat: number;
    lng: number;
  }[];
}

export type { CasualtyData };

interface CasualtyPanelProps {
  data: CasualtyData;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "\u2014";
  return n.toLocaleString();
}

export default function CasualtyPanel({ data }: CasualtyPanelProps) {
  const s = data.bySource;
  const hrana = s.hrana.iran;
  const gulf = data.gulfStateDeaths;
  const gulfTotal = gulf.uae.killed + gulf.saudi.killed + gulf.bahrain.killed + gulf.qatar.killed + (gulf.kuwait.killed || 0) + (gulf.jordan.killed || 0);

  const sourceRows: { name: string; killed: string; civ: string; mil: string; asOf: string; method: string }[] = [
    { name: "HRANA", killed: fmt(s.hrana.iran.killed_total), civ: fmt(s.hrana.iran.killed_civilian), mil: fmt(s.hrana.iran.killed_military), asOf: s.hrana.asOf, method: "Field reports, multi-stage verification" },
    { name: "HENGAW", killed: fmt(s.hengaw.iran.killed_total), civ: fmt(s.hengaw.iran.killed_civilian), mil: fmt(s.hengaw.iran.killed_military), asOf: s.hengaw.asOf, method: "Kurdistan-focused, ground-level" },
    { name: "AL JAZEERA", killed: fmt(s.alJazeera.total), civ: "\u2014", mil: "\u2014", asOf: s.alJazeera.asOf, method: "Preliminary, govt + field" },
    { name: "RED CRESCENT", killed: fmt(s.redCrescent.iran.killed), civ: "\u2014", mil: "\u2014", asOf: s.redCrescent.asOf, method: "Official Iranian (undercount)" },
    { name: "IRANWARLIVE", killed: fmt(s.iranWarLive.all_fronts_total), civ: "\u2014", mil: "\u2014", asOf: s.iranWarLive.asOf, method: "OSINT deduplicated" },
    { name: "WAPO (civ)", killed: "\u2014", civ: fmt(s.washingtonPost.iran_civilian_killed), mil: "\u2014", asOf: s.washingtonPost.asOf, method: "Investigation, conservative" },
    { name: "US/IL CLAIM", killed: "\u2014", civ: "\u2014", mil: "6,000+", asOf: s.usIsraelClaims.asOf, method: "Military briefings (unverified)" },
  ];

  return (
    <div className="h-full overflow-y-auto bg-void p-4 font-mono text-[13px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="font-heading text-[18px] tracking-[2px] text-danger uppercase flex items-center gap-2">
          <span className="text-accent">&#9670;</span> Casualty Tracker
        </div>
        <div className="font-mono text-[14px] text-danger">D+{data.dayOfWar}</div>
      </div>
      <div className="text-text-muted text-[11px] mb-4">
        Data as of {data.asOf} | {data.note}
      </div>

      {/* Source Comparison Table */}
      <div className="mb-4">
        <div className="font-heading text-[15px] tracking-[1.5px] text-accent uppercase mb-2">
          Source Comparison — Iran Deaths
        </div>

        {/* Range highlight */}
        <div className="bg-surface-2 border border-border px-3 py-2 mb-3">
          <span className="text-text-muted">RANGE: </span>
          <span className="text-danger font-bold text-[15px]">800 — 5,300</span>
          <span className="text-text-muted"> killed in Iran</span>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[1fr_80px_80px_80px] gap-0 border-b border-border pb-1 mb-1">
          <span className="text-text-muted text-[11px]">SOURCE</span>
          <span className="text-text-muted text-[11px] text-right">KILLED</span>
          <span className="text-text-muted text-[11px] text-right">CIV</span>
          <span className="text-text-muted text-[11px] text-right">MIL</span>
        </div>

        {/* Table rows */}
        {sourceRows.map((row) => (
          <div
            key={row.name}
            className="grid grid-cols-[1fr_80px_80px_80px] gap-0 py-0.5 hover:bg-surface-2 transition-colors group"
          >
            <span className="text-text-dim truncate" title={`${row.method} (${row.asOf})`}>
              {row.name}
            </span>
            <span className="text-right text-white">{row.killed}</span>
            <span className="text-right" style={{ color: row.civ !== "\u2014" ? "#d06090" : "#7d8590" }}>
              {row.civ}
            </span>
            <span className="text-right" style={{ color: row.mil !== "\u2014" ? "#e6edf3" : "#7d8590" }}>
              {row.mil}
            </span>
          </div>
        ))}
      </div>

      <div className="h-px bg-border my-3" />

      {/* Iran Detail (HRANA) */}
      <div className="mb-4">
        <div className="font-heading text-[14px] tracking-[1.5px] text-danger uppercase mb-1.5 flex items-center gap-1">
          <span className="text-accent">&#9670;</span> Iran (HRANA Detail)
        </div>
        <div className="space-y-0.5 text-text-dim">
          <div className="flex justify-between">
            <span>Killed (total)</span>
            <span className="text-danger">{fmt(hrana.killed_total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Killed (civilian)</span>
            <span className="text-danger">{fmt(hrana.killed_civilian)}</span>
          </div>
          <div className="flex justify-between">
            <span>Killed (military)</span>
            <span className="text-white">{fmt(hrana.killed_military)}</span>
          </div>
          <div className="flex justify-between">
            <span>Killed (unclassified)</span>
            <span className="text-text">{fmt(hrana.killed_unclassified)}</span>
          </div>
          <div className="flex justify-between">
            <span>Injured (civilian)</span>
            <span className="text-warning">{fmt(hrana.injured_civilian)}</span>
          </div>
          <div className="flex justify-between">
            <span>Provinces hit</span>
            <span className="text-white">{hrana.provinces_hit} / 31</span>
          </div>
          <div className="flex justify-between">
            <span>Cities struck</span>
            <span className="text-white">{fmt(hrana.cities_hit)}</span>
          </div>
          <div className="flex justify-between">
            <span>Attacks recorded</span>
            <span className="text-white">{fmt(hrana.attacks_recorded)}+</span>
          </div>
          <div className="h-px bg-border my-1" />
          <div className="flex justify-between">
            <span style={{ color: "#d06090" }}>Children killed</span>
            <span style={{ color: "#d06090" }}>{fmt(hrana.children_killed)}+</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "#d06090" }}>Women killed</span>
            <span style={{ color: "#d06090" }}>{fmt(hrana.women_killed)}</span>
          </div>
        </div>
      </div>

      <div className="h-px bg-border my-3" />

      {/* US Military */}
      <div className="mb-4">
        <div className="font-heading text-[14px] tracking-[1.5px] uppercase mb-1.5 flex items-center gap-1" style={{ color: "#388bfd" }}>
          <span className="text-accent">&#9670;</span> US Military
        </div>
        <div className="space-y-0.5 text-text-dim">
          <div className="flex justify-between">
            <span>KIA (enemy fire)</span>
            <span style={{ color: "#388bfd" }}>{data.usDeaths.killed_by_enemy_fire}</span>
          </div>
          <div className="flex justify-between">
            <span>Aviation crash</span>
            <span style={{ color: "#388bfd" }}>{data.usDeaths.aviation_crash}</span>
          </div>
          <div className="flex justify-between">
            <span>Health-related</span>
            <span style={{ color: "#388bfd" }}>{data.usDeaths.health_related}</span>
          </div>
          <div className="h-px bg-border my-1" />
          <div className="flex justify-between font-bold">
            <span>TOTAL</span>
            <span style={{ color: "#388bfd" }}>{data.usDeaths.total_including_accidents}</span>
          </div>
        </div>
        <div className="mt-1.5 space-y-0.5 text-[10px] text-text-muted">
          {data.usDeaths.details.map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
      </div>

      <div className="h-px bg-border my-3" />

      {/* Israel */}
      <div className="mb-4">
        <div className="font-heading text-[14px] tracking-[1.5px] text-white uppercase mb-1.5 flex items-center gap-1">
          <span className="text-accent">&#9670;</span> Israel
        </div>
        <div className="space-y-0.5 text-text-dim">
          <div className="flex justify-between">
            <span>Killed</span>
            <span className="text-white">{data.israelDeaths.killed}</span>
          </div>
          <div className="flex justify-between">
            <span>Injured</span>
            <span className="text-white">{data.israelDeaths.injured}</span>
          </div>
        </div>
        <div className="mt-1.5 space-y-0.5 text-[10px] text-text-muted">
          {data.israelDeaths.details.map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
      </div>

      <div className="h-px bg-border my-3" />

      {/* Gulf States */}
      <div className="mb-4">
        <div className="font-heading text-[14px] tracking-[1.5px] text-warning uppercase mb-1.5 flex items-center gap-1">
          <span className="text-accent">&#9670;</span> Gulf States
        </div>
        <div className="space-y-0.5 text-text-dim">
          <div className="flex justify-between">
            <span>UAE</span>
            <span className="text-warning">{gulf.uae.killed} killed, {fmt(gulf.uae.injured)} injured</span>
          </div>
          <div className="flex justify-between">
            <span>Saudi Arabia</span>
            <span className="text-warning">{gulf.saudi.killed} killed, {fmt(gulf.saudi.injured)} injured</span>
          </div>
          <div className="flex justify-between">
            <span>Bahrain</span>
            <span className="text-warning">{gulf.bahrain.killed} killed</span>
          </div>
          <div className="flex justify-between">
            <span>Jordan</span>
            <span className="text-warning">{fmt(gulf.jordan.injured)} injured</span>
          </div>
          <div className="h-px bg-border my-1" />
          <div className="flex justify-between font-bold">
            <span>Gulf Total Killed</span>
            <span className="text-warning">{gulfTotal}+</span>
          </div>
        </div>
        <div className="mt-1.5 text-[10px] text-text-muted">
          UAE intercepted: 398 ballistic missiles, 1,872 drones, 15 cruise missiles
        </div>
      </div>

      <div className="h-px bg-border my-3" />

      {/* Iraq & Lebanon */}
      <div className="mb-4">
        <div className="font-heading text-[14px] tracking-[1.5px] text-accent uppercase mb-1.5 flex items-center gap-1">
          <span>&#9670;</span> Other Fronts
        </div>
        <div className="space-y-0.5 text-text-dim">
          <div className="flex justify-between">
            <span>Iraq</span>
            <span className="text-danger">{fmt(s.alJazeera.iraq.killed)} killed (mostly PMF)</span>
          </div>
          <div className="flex justify-between">
            <span>Lebanon</span>
            <span className="text-[#c8b832]">1,000+ (separate conflict)</span>
          </div>
        </div>
      </div>

      <div className="h-px bg-border my-3" />

      {/* Notable Incidents */}
      <div className="mb-4">
        <div className="font-heading text-[14px] tracking-[1.5px] text-danger uppercase mb-1.5 flex items-center gap-1">
          <span className="text-accent">&#9670;</span> Notable Incidents
        </div>
        <div className="space-y-2">
          {data.notableIncidents.map((inc, i) => {
            const typeColor =
              inc.type === "civilian" ? "#d06090" :
              inc.type === "us_military" ? "#388bfd" :
              inc.type === "leadership" ? "#e8364a" :
              "#e6edf3";
            return (
              <div key={i} className="bg-surface border border-border px-2.5 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-text-muted">{inc.date}</span>
                  <span className="text-[11px] uppercase tracking-wider" style={{ color: typeColor }}>
                    {inc.type.replace("_", " ")}
                  </span>
                </div>
                <div className="font-bold mt-0.5" style={{ color: typeColor }}>
                  {inc.event}
                </div>
                <div className="text-white text-[14px] font-bold mt-0.5">
                  {inc.killed} killed
                </div>
                <div className="text-text-muted text-[11px] mt-0.5">
                  {inc.details}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer note */}
      <div className="text-[10px] text-text-muted mt-4 border-t border-border pt-2">
        Figures vary by methodology. All should be treated as estimates. Source dates shown on hover.
      </div>
    </div>
  );
}
