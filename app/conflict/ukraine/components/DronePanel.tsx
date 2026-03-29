"use client";

export interface DroneWarfareData {
  asOf: string;
  source: string;
  russianDronesOnUkraine: {
    totalLaunched: { allTime: number; feb2026: number; mar2026: number };
    monthlyRecord: { month: string; drones: number; missiles: number; note: string };
    interceptRate: number;
    strikeEffectiveness: { jan2025: number; jan2026: number; note: string };
    dailyProduction: { current: number; planned: number; plannedBy: string };
    costPerDrone: { low: number; high: number };
    types: { name: string; type: string; speed: string; range: string; payload: string }[];
    launchSites: { name: string; lat: number; lng: number; launches: number; note: string }[];
    techUpgrades2026: string[];
  };
  ukrainianDronesOnRussia: {
    summary: { strikePackages_jan_mar_2026: number; avgDronesPerNight: string; largestSwarm: string; targetsPerNight: number; note: string };
    majorTargets: { name: string; lat: number; lng: number; type: string; hits: string }[];
    antiAirDefenseHunting: { pantsirDestroyed: string; systemsKilledOneNight: string; method: string; note: string };
  };
  interceptMethods: { method: string; share: string; cost: string }[];
  recentAttacks: { date: string; attacker: string; drones?: number; missiles?: number; intercepted?: string; target?: string; note: string }[];
  droneRoutes?: { name: string; from: [number, number]; waypoints: [number, number][]; to: [number, number]; color: string }[];
}

interface DronePanelProps {
  data: DroneWarfareData;
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-muted">{label}</span>
      <span style={{ color: color || "#e6edf3" }}>{value}</span>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function DronePanel({ data }: DronePanelProps) {
  const ru = data.russianDronesOnUkraine;
  const ua = data.ukrainianDronesOnRussia;

  return (
    <div className="h-full overflow-y-auto bg-void">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="font-heading text-[16px] tracking-[2px] text-danger uppercase flex items-center gap-1.5">
          <span>&#9830;</span> Drone Warfare
        </div>
        <div className="font-mono text-[11px] text-text-muted mt-1">
          The defining feature of the 2025-2026 conflict
        </div>
      </div>

      {/* RU → UA section */}
      <div className="px-4 py-3 border-b border-border">
        <div className="font-heading text-[14px] tracking-[1.5px] text-danger uppercase mb-2">
          RU &#8594; UA &mdash; Russian Attacks on Ukraine
        </div>

        {/* Big stat: monthly record */}
        <div className="flex gap-4 mb-3">
          <div className="text-center flex-1">
            <div className="font-mono text-[30px] font-bold text-danger leading-none">
              {ru.monthlyRecord.drones.toLocaleString()}
            </div>
            <div className="font-mono text-[10px] text-text-muted">DRONES / FEB 2026</div>
          </div>
          <div className="text-center flex-1">
            <div className="font-mono text-[30px] font-bold text-[#d4962a] leading-none">
              {ru.monthlyRecord.missiles}
            </div>
            <div className="font-mono text-[10px] text-text-muted">MISSILES / FEB 2026</div>
          </div>
        </div>

        <div className="font-mono text-[12px] space-y-0.5">
          <StatRow label="All-Time Launched" value={`~${(ru.totalLaunched.allTime / 1000).toFixed(0)}k`} color="#e8364a" />
          <StatRow label="Intercept Rate" value={`~${Math.round(ru.interceptRate * 100)}%`} color="#00d4aa" />
          <StatRow label="Strike Effectiveness" value={`~${Math.round(ru.strikeEffectiveness.jan2026 * 100)}% (up from ${Math.round(ru.strikeEffectiveness.jan2025 * 100)}%)`} color="#d4962a" />
          <StatRow label="Daily Production" value={`${ru.dailyProduction.current}/day`} color="#e8364a" />
          <StatRow label="Planned Production" value={`${ru.dailyProduction.planned.toLocaleString()}/day by ${ru.dailyProduction.plannedBy}`} color="#e8364a" />
        </div>

        {/* Intercept bar */}
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] text-text-muted">INTERCEPT RATE</span>
            <span className="font-mono text-[10px] text-accent ml-auto">~90%</span>
          </div>
          <div className="h-1.5 bg-surface-2 overflow-hidden flex">
            <div className="h-full bg-accent" style={{ width: "90%" }} />
            <div className="h-full bg-danger" style={{ width: "10%" }} />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="font-mono text-[9px] text-accent">Intercepted</span>
            <span className="font-mono text-[9px] text-danger">Got Through</span>
          </div>
        </div>
      </div>

      {/* UA → RU section */}
      <div className="px-4 py-3 border-b border-border">
        <div className="font-heading text-[14px] tracking-[1.5px] text-[#005BBB] uppercase mb-2">
          UA &#8594; RU &mdash; Ukrainian Strikes on Russia
        </div>

        <div className="font-mono text-[12px] space-y-0.5">
          <StatRow label="Strike Packages (Jan-Mar)" value={String(ua.summary.strikePackages_jan_mar_2026)} color="#005BBB" />
          <StatRow label="Avg Per Night" value={ua.summary.avgDronesPerNight} color="#005BBB" />
          <StatRow label="Largest Swarm" value={ua.summary.largestSwarm} color="#005BBB" />
          <StatRow label="Targets/Night" value={`~${ua.summary.targetsPerNight}`} color="#005BBB" />
        </div>

        {/* Air defense hunting */}
        <div className="mt-2 p-2 bg-surface border border-border/50">
          <div className="font-heading text-[11px] tracking-[1px] text-[#FFD500] uppercase mb-1">
            Air Defense Hunting (SBU Alpha)
          </div>
          <div className="font-mono text-[11px] space-y-0.5">
            <StatRow label="Pantsir Destroyed" value={ua.antiAirDefenseHunting.pantsirDestroyed} color="#FFD500" />
            <StatRow label="Systems/Night Record" value={ua.antiAirDefenseHunting.systemsKilledOneNight} color="#FFD500" />
          </div>
        </div>
      </div>

      {/* Cost Asymmetry */}
      <div className="px-4 py-3 border-b border-border">
        <div className="font-heading text-[14px] tracking-[1.5px] text-[#d4962a] uppercase mb-2">
          Cost Asymmetry
        </div>
        <div className="font-mono text-[12px] space-y-0.5">
          <StatRow label="Shahed Cost" value={`$${(ru.costPerDrone.low / 1000).toFixed(0)}-${(ru.costPerDrone.high / 1000).toFixed(0)}K each`} color="#e8364a" />
          <StatRow label="Interceptor Cost" value="$1-3M each" color="#d4962a" />
          <StatRow label="Cost Ratio" value="~30:1 to 150:1" color="#d4962a" />
        </div>
        <div className="font-mono text-[10px] text-text-dim mt-1.5 italic">
          Russia spending $100M/month on drones. Ukraine spending $3B+/month to intercept.
        </div>
      </div>

      {/* Drone Types */}
      <div className="px-4 py-3 border-b border-border">
        <div className="font-heading text-[13px] tracking-[1.5px] text-accent uppercase mb-2">
          Russian Drone Types
        </div>
        <div className="space-y-1.5">
          {ru.types.map((t) => (
            <div key={t.name} className="font-mono text-[11px]">
              <div className="text-white font-semibold">{t.name}</div>
              <div className="text-text-muted text-[10px]">
                {t.type} &mdash; {t.speed} &mdash; {t.range}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Attacks */}
      <div className="px-4 py-3 border-b border-border">
        <div className="font-heading text-[13px] tracking-[1.5px] text-accent uppercase mb-2">
          Recent Major Attacks
        </div>
        <div className="space-y-2">
          {data.recentAttacks.map((atk, i) => (
            <div key={i} className="font-mono text-[11px] border-l-2 pl-2" style={{ borderColor: atk.attacker === "Russia" ? "#e8364a" : "#005BBB" }}>
              <div className="flex items-center gap-2">
                <span className="text-text-muted">{formatDate(atk.date)}</span>
                <span style={{ color: atk.attacker === "Russia" ? "#e8364a" : "#005BBB" }}>
                  {atk.attacker.toUpperCase()}
                </span>
                {atk.drones ? <span className="text-white">{atk.drones} drones</span> : null}
              </div>
              <div className="text-text-dim text-[10px]">{atk.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Upgrades */}
      <div className="px-4 py-3 border-b border-border">
        <div className="font-heading text-[13px] tracking-[1.5px] text-danger uppercase mb-2">
          2026 Russian Tech Upgrades
        </div>
        <div className="space-y-0.5">
          {ru.techUpgrades2026.map((u, i) => (
            <div key={i} className="font-mono text-[10px] text-text-dim flex items-start gap-1.5">
              <span className="text-danger mt-0.5">&#9679;</span>
              <span>{u}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Intercept Methods */}
      <div className="px-4 py-3">
        <div className="font-heading text-[13px] tracking-[1.5px] text-accent uppercase mb-2">
          Intercept Methods (Ukraine)
        </div>
        <div className="space-y-1">
          {data.interceptMethods.map((m, i) => (
            <div key={i} className="font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-text-dim">{m.method}</span>
                <span className="text-accent">{m.share}</span>
              </div>
              <div className="text-text-muted text-[9px]">{m.cost}</div>
            </div>
          ))}
        </div>
        <div className="font-mono text-[9px] text-text-muted mt-2">
          Sources: {data.source} | As of {data.asOf}
        </div>
      </div>
    </div>
  );
}
