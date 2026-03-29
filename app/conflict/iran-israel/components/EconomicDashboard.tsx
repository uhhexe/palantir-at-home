"use client";

import { useState, useEffect } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface EconomicData {
  asOf: string;
  source: string;
  warCosts: any;
  oilPrices: any;
  gasPrices: any;
  strategicReserves: any;
  globalGdpImpact: any;
  householdImpact: any;
  interceptorEconomics: any;
  marketDisruption: any;
}

interface EconomicDashboardProps {
  data: EconomicData;
}

// ── Formatters ──

function fmtB(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

function fmtComma(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

// ── Section header ──

function SectionHeader({ title, color }: { title: string; color?: string }) {
  const c = color || "#00d4aa";
  return (
    <div className="mb-2">
      <div className="font-heading text-[13px] tracking-[2px] uppercase flex items-center gap-1.5" style={{ color: c }}>
        <span>&#9670;</span> {title}
      </div>
      <div className="h-px mt-1" style={{ background: `linear-gradient(to right, ${c}, transparent)` }} />
    </div>
  );
}

// ── Row ──

function Row({ label, value, valueColor, source, indent }: { label: string; value: string; valueColor?: string; source?: string; indent?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between font-mono text-[12px] ${indent ? "pl-3" : ""}`}>
      <span className="text-text-dim">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="font-bold tabular-nums" style={{ color: valueColor || "#e6edf3" }}>{value}</span>
        {source && <span className="text-[9px] text-text-muted">({source})</span>}
      </div>
    </div>
  );
}

// ── Oil Sparkline ──

function OilSparkline({ data }: { data: { date: string; brent: number; event?: string }[] }) {
  const width = 320;
  const height = 70;
  const padding = 4;

  const prices = data.map(d => d.brent);
  const min = Math.min(...prices) - 5;
  const max = Math.max(...prices) + 5;
  const peakVal = Math.max(...prices);

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((d.brent - min) / (max - min)) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {/* Grid lines */}
      {[73, 90, 100, 110, 119].map(price => {
        const y = height - padding - ((price - min) / (max - min)) * (height - padding * 2);
        return (
          <g key={price}>
            <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(0,210,170,0.06)" strokeDasharray="2 3" />
            <text x={width - 2} y={y - 2} textAnchor="end" fill="#7d8590" fontSize="7" fontFamily="Inconsolata, monospace">
              ${price}
            </text>
          </g>
        );
      })}
      {/* Area fill */}
      <polygon
        points={`${padding},${height - padding} ${points} ${width - padding * 2 + padding},${height - padding}`}
        fill="url(#oilGradient)"
      />
      <defs>
        <linearGradient id="oilGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff3b5c" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ff3b5c" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="#ff3b5c"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Event dots */}
      {data.map((d, i) => {
        const x = padding + (i / (data.length - 1)) * (width - padding * 2);
        const y = height - padding - ((d.brent - min) / (max - min)) * (height - padding * 2);
        const isPeak = d.brent === peakVal;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={isPeak ? 3.5 : 2} fill={isPeak ? "#ff3b5c" : "#ff3b5c80"} />
            {isPeak && (
              <text x={x} y={y - 7} textAnchor="middle" fill="#ff3b5c" fontSize="9" fontFamily="Inconsolata, monospace" fontWeight="700">
                ${d.brent}
              </text>
            )}
          </g>
        );
      })}
      {/* Start label */}
      <text x={padding + 2} y={height - padding - ((data[0].brent - min) / (max - min)) * (height - padding * 2) - 5} fill="#8b949e" fontSize="8" fontFamily="Inconsolata, monospace">
        ${data[0].brent}
      </text>
    </svg>
  );
}

// ── War Cost Ticker ──

function WarCostTicker() {
  const [cost, setCost] = useState(0);

  useEffect(() => {
    const warStart = new Date("2026-02-28T06:00:00Z");
    const firstSixDayCost = 11300000000;
    const dailyRate = 1000000000;

    const update = () => {
      const now = new Date();
      const elapsed = (now.getTime() - warStart.getTime()) / 1000;
      const days = elapsed / 86400;

      let total: number;
      if (days <= 6) {
        total = (days / 6) * firstSixDayCost;
      } else {
        total = firstSixDayCost + (days - 6) * dailyRate;
      }
      setCost(total);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatted = fmtComma(cost);

  return (
    <div className="my-2">
      <div
        className="font-mono text-[24px] font-bold tracking-[1px]"
        style={{ color: "#ff3b5c", textShadow: "0 0 10px rgba(255,59,92,0.3)" }}
      >
        {formatted}
      </div>
      <div className="font-mono text-[9px] text-text-muted tracking-[2px] uppercase mt-0.5">
        Est. US Taxpayer Cost Since Feb 28
      </div>
      <div className="font-mono text-[9px] text-[#7d8590] mt-0.5">
        Based on Pentagon: $11.3B/6 days + $1B/day ongoing
      </div>
    </div>
  );
}

// ── GDP Impact Bar ──

function GdpBar({ label, value, maxAbs }: { label: string; value: number; maxAbs: number }) {
  const pct = Math.abs(value) / maxAbs * 100;
  const color = Math.abs(value) >= 10 ? "#ff3b5c" : Math.abs(value) >= 3 ? "#ff8c42" : "#ffb830";
  return (
    <div className="flex items-center gap-2 font-mono text-[11px]">
      <span className="text-text-dim w-[100px] shrink-0 text-right">{label}</span>
      <div className="flex-1 h-[8px] bg-surface-2/50 relative overflow-hidden" style={{ border: `1px solid ${color}20` }}>
        <div className="h-full" style={{ width: `${pct}%`, background: `linear-gradient(to right, ${color}40, ${color})` }} />
      </div>
      <span className="font-bold w-[50px] shrink-0" style={{ color }}>{value}%</span>
    </div>
  );
}

// ── Main Component ──

export default function EconomicDashboard({ data }: EconomicDashboardProps) {
  const wc = data.warCosts;
  const oil = data.oilPrices;
  const gas = data.gasPrices;
  const reserves = data.strategicReserves;
  const gdp = data.globalGdpImpact;
  const household = data.householdImpact;
  const interceptor = data.interceptorEconomics;
  const market = data.marketDisruption;

  return (
    <div className="h-full overflow-y-auto bg-void">
      {/* Classification header */}
      <div className="bg-[#1a0a0a] border-b border-danger/30 px-4 py-1.5 flex items-center justify-between">
        <span className="font-mono text-[10px] text-danger/70 tracking-[2px]">
          TOP SECRET // NOFORN // ECONOMIC INTELLIGENCE
        </span>
        <span className="font-mono text-[10px] text-text-muted">
          FINANCIAL WARFARE ASSESSMENT
        </span>
      </div>

      {/* Title */}
      <div className="px-4 py-3 border-b border-border">
        <div className="font-heading text-[18px] tracking-[2px] text-danger uppercase">
          Economic Impact Dashboard
        </div>
        <div className="font-mono text-[10px] text-text-muted mt-1 leading-relaxed">
          Iran&apos;s strategy: make the war so expensive that political pressure forces de-escalation. Tracking US taxpayer costs, energy prices, interceptor economics, and global GDP impact.
        </div>
        <div className="font-mono text-[10px] text-text-muted mt-0.5">
          Sources: {data.source} &mdash; As of {data.asOf}
        </div>
      </div>

      {/* Two-column grid for dense Bloomberg-style layout */}
      <div className="grid grid-cols-2 gap-0 divide-x divide-border/40">

        {/* ═══ LEFT COLUMN ═══ */}
        <div className="divide-y divide-border/40">

          {/* War Cost to US Taxpayer */}
          <div className="px-4 py-3">
            <SectionHeader title="War Cost to US Taxpayer" color="#ff3b5c" />
            <WarCostTicker />
            <div className="space-y-1 mt-2">
              <Row label="First 100 hours" value={fmtB(wc.us_first_100_hours.total)} valueColor="#ff3b5c" source="CSIS" />
              <Row label="First 6 days" value={fmtB(wc.us_first_6_days.total)} valueColor="#ff3b5c" source="Pentagon" />
              <Row label="Daily rate" value={`${fmtB(wc.daily_ongoing.low)}-${fmtB(wc.daily_ongoing.high).replace("$", "")}`} valueColor="#ff8c42" source="Penn Wharton" />
              <Row label="60-day projected" value={fmtB(wc.projected_60_day_total.direct_military)} valueColor="#ff3b5c" source="Fortune" />
              <Row label="Pentagon request" value={fmtB(wc.pentagon_supplemental_request)} valueColor="#ff3b5c" source="supplemental" />
              <Row label="Total w/ economic" value={fmtB(wc.projected_total_with_economic.high)} valueColor="#ff3b5c" source="worst case" />
            </div>

            {/* 6-day breakdown */}
            <div className="mt-3">
              <div className="font-mono text-[9px] text-text-muted tracking-[1px] uppercase mb-1">First 6 Days Breakdown ($11.3B)</div>
              {Object.entries(wc.us_first_6_days.breakdown).map(([key, val]) => {
                const pct = ((val as number) / wc.us_first_6_days.total) * 100;
                const label = key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                return (
                  <div key={key} className="flex items-center gap-2 font-mono text-[10px] mb-0.5">
                    <span className="text-text-muted w-[130px] shrink-0">{label}</span>
                    <div className="flex-1 h-[6px] bg-surface-2/50 overflow-hidden">
                      <div className="h-full bg-danger/60" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-text-dim w-[50px] text-right shrink-0">{fmtB(val as number)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Oil Price */}
          <div className="px-4 py-3">
            <SectionHeader title="Oil Price (Brent Crude)" color="#ff3b5c" />
            <div className="space-y-1">
              <Row label="Pre-war (Feb 27)" value={`$${oil.preWar.brent}/bbl`} />
              <Row label="Current" value={`$${oil.timeline[oil.timeline.length - 1].brent}/bbl`} valueColor="#ff3b5c" />
              <Row label="Peak (Mar 19)" value={`$${oil.peak}/bbl`} valueColor="#ff3b5c" />
              <Row label="Change" value={`+${oil.changePercent}%`} valueColor="#ff3b5c" />
              <Row label="Hormuz share" value={oil.hormuzShare} valueColor="#ff8c42" />
            </div>
            <div className="mt-3">
              <OilSparkline data={oil.timeline} />
            </div>
            {/* Event labels */}
            <div className="mt-2 space-y-0.5">
              {oil.timeline.map((t: any, i: number) => (
                <div key={i} className="flex items-baseline gap-2 font-mono text-[9px]">
                  <span className="text-text-muted shrink-0 w-[70px]">{t.date.slice(5)}</span>
                  <span className="text-[#ff3b5c] font-bold shrink-0 w-[35px] text-right">${t.brent}</span>
                  <span className="text-text-dim">{t.event}</span>
                </div>
              ))}
            </div>
          </div>

          {/* US Gas Prices */}
          <div className="px-4 py-3">
            <SectionHeader title="US Gas Prices" color="#ff8c42" />
            <div className="space-y-1">
              <Row label="State of Union (Feb 14)" value={`$${gas.us_average.preWar}/gal`} />
              <Row label="Inauguration" value={`$${gas.us_average.inauguration}/gal`} />
              <Row label="Mar 9" value={`$${gas.us_average.mar_9}/gal`} valueColor="#ff8c42" />
              <Row label="Mar 12" value={`$${gas.us_average.mar_12}/gal`} valueColor="#ff3b5c" />
              <Row label="Weekly jump" value={`+$${gas.us_average.weeklyJump}`} valueColor="#ff3b5c" />
              <Row label="SF (Shell station)" value={`$${gas.sanFrancisco.regular}/gal`} valueColor="#ff3b5c" />
            </div>
            <div className="mt-2 px-2 py-1.5 border border-[#ff8c42]/20 bg-[#ff8c42]/05">
              <div className="font-mono text-[10px] text-[#ff8c42] italic">
                &ldquo;{gas.us_average.note}&rdquo;
              </div>
              <div className="font-mono text-[9px] text-text-muted mt-0.5">&mdash; {gas.us_average.source}</div>
            </div>
          </div>

          {/* Strategic Reserves */}
          <div className="px-4 py-3">
            <SectionHeader title="Strategic Reserves Deployed" color="#388bfd" />
            <div className="space-y-1">
              <Row label="IEA total release" value={`${(reserves.iea_release.total_barrels / 1e6).toFixed(0)}M barrels`} valueColor="#388bfd" />
              <Row label="US SPR release" value={`${(reserves.us_spr_release.barrels / 1e6).toFixed(0)}M barrels`} valueColor="#388bfd" />
            </div>
            <div className="mt-2 px-2 py-1.5 border border-[#388bfd]/20 bg-[#388bfd]/05">
              <div className="font-mono text-[10px] text-[#388bfd] italic">
                &ldquo;Largest coordinated release in IEA history&rdquo;
              </div>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT COLUMN ═══ */}
        <div className="divide-y divide-border/40">

          {/* Interceptor Economics */}
          <div className="px-4 py-3">
            <SectionHeader title="Interceptor Economics" color="#ffb830" />
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-mono text-[9px] text-text-muted tracking-[1px] uppercase">Overall Cost Ratio:</span>
              <span className="font-mono text-[18px] font-bold text-[#ffb830]">{interceptor.costRatio}:1</span>
              <span className="font-mono text-[10px] text-[#ff3b5c]">(Iran&apos;s favor)</span>
            </div>

            {/* Attack → Defense table */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 font-mono text-[9px] text-text-muted tracking-[1px] uppercase">
                <span className="w-[110px]">Attack</span>
                <span className="w-[8px]">&rarr;</span>
                <span className="w-[120px]">Defense</span>
                <span className="ml-auto">Ratio</span>
              </div>
              {interceptor.data.map((d: any, i: number) => (
                <div key={i} className="flex items-center gap-1 font-mono text-[11px]">
                  <div className="w-[110px] shrink-0">
                    <span className="text-[#e8364a]">{fmtB(d.cost)}</span>
                    <span className="text-text-muted text-[9px] ml-1">{d.attack.split(" ")[0]}</span>
                  </div>
                  <span className="w-[8px] text-text-muted">&rarr;</span>
                  <div className="w-[120px] shrink-0">
                    <span className="text-[#388bfd]">{fmtB(d.defenseCost)}</span>
                    <span className="text-text-muted text-[9px] ml-1">{d.defense.split(" ")[0]}</span>
                  </div>
                  <span className="ml-auto font-bold" style={{
                    color: d.ratio.includes("60,000") ? "#ff3b5c" : d.ratio.includes("133") ? "#ff8c42" : "#ffb830"
                  }}>
                    {d.ratio}
                  </span>
                </div>
              ))}
            </div>

            {/* Key stat callout */}
            <div className="mt-3 px-2 py-1.5 border border-danger/20 bg-danger/05">
              <div className="font-mono text-[10px] text-danger font-bold">
                &#x26A0; Iran destroyed a $600M radar with a $10K drone
              </div>
              <div className="font-mono text-[9px] text-text-muted mt-0.5">
                60,000:1 cost ratio. Only 10 AN/TPY-2 radars exist worldwide.
              </div>
            </div>

            {/* First wave stats */}
            <div className="mt-2 space-y-0.5">
              <Row label="First wave drones" value={interceptor.iran_first_wave.drones_launched.toLocaleString()} />
              <Row label="First wave missiles" value={interceptor.iran_first_wave.missiles_launched.toLocaleString()} />
              <Row label="Interceptor cost (100h)" value={`${fmtB(interceptor.iran_first_wave.interceptor_cost_100_hours.low)}-${fmtB(interceptor.iran_first_wave.interceptor_cost_100_hours.high).replace("$", "")}`} valueColor="#ff3b5c" source="CSIS" />
            </div>
          </div>

          {/* Global GDP Impact */}
          <div className="px-4 py-3">
            <SectionHeader title="Global GDP Impact" color="#ff8c42" />
            <div className="space-y-1.5">
              <GdpBar label="World (WTO)" value={gdp.wto.gdp_reduction} maxAbs={14} />
              <GdpBar label="Europe" value={gdp.europe.gdp_reduction} maxAbs={14} />
              <GdpBar label="Saudi Arabia" value={gdp.gulfStates.saudi} maxAbs={14} />
              <GdpBar label="UAE" value={gdp.gulfStates.uae} maxAbs={14} />
              <GdpBar label="Kuwait/Qatar" value={gdp.gulfStates.kuwait_qatar} maxAbs={14} />
            </div>
            <div className="mt-2 px-2 py-1.5 border border-[#ff8c42]/20 bg-[#ff8c42]/05">
              <div className="font-mono text-[10px] text-[#ff8c42]">
                ECB: {gdp.ecb.action} ({gdp.ecb.date})
              </div>
              <div className="font-mono text-[9px] text-text-muted mt-0.5">{gdp.ecb.note}</div>
            </div>
          </div>

          {/* Household Impact */}
          <div className="px-4 py-3">
            <SectionHeader title="Household Impact" color="#c84bc8" />
            <div className="space-y-1">
              <Row label="Tariffs alone (2026)" value={`$${household.avg_cost_per_household_2026.tariffs_alone.low}-${household.avg_cost_per_household_2026.tariffs_alone.high}/yr`} valueColor="#c84bc8" source="Yale" />
              <Row label="War additional" value="Significant" valueColor="#ff8c42" />
            </div>
            <div className="h-px bg-border/40 my-2" />
            <div className="font-mono text-[10px] text-text-muted tracking-[1px] uppercase mb-1">Fertilizer Crisis</div>
            <div className="space-y-1">
              <Row label="Urea price increase" value={`+${household.fertilizer.urea_price_increase}%`} valueColor="#ff3b5c" />
              <Row label="Gulf share of global urea" value={`${household.fertilizer.gulf_share_global_urea}%`} valueColor="#ff8c42" />
              <Row label="Gulf share of ammonia" value={`${household.fertilizer.gulf_share_global_ammonia}%`} valueColor="#ff8c42" />
              <Row label="Hormuz urea transit" value={`${household.fertilizer.hormuz_share_urea_transit}%`} valueColor="#ff8c42" />
            </div>
            <div className="mt-2 font-mono text-[10px] text-text-dim leading-relaxed">
              {household.fertilizer.impact}
            </div>
          </div>

          {/* Market Disruption */}
          <div className="px-4 py-3">
            <SectionHeader title="Market Disruption" color="#d4962a" />

            {/* Natural Gas */}
            <div className="font-mono text-[10px] text-text-muted tracking-[1px] uppercase mb-1">Natural Gas</div>
            <div className="space-y-1">
              <Row label="TTF single-day spike" value={market.naturalGas.ttf_change_single_day} valueColor="#ff3b5c" />
              <Row label="Doubled in month" value="YES" valueColor="#ff3b5c" />
            </div>
            <div className="mt-1 px-2 py-1 border border-[#d4962a]/20 bg-[#d4962a]/05">
              <div className="font-mono text-[10px] text-[#d4962a] italic">
                &ldquo;{market.naturalGas.shellCeo}&rdquo;
              </div>
              <div className="font-mono text-[9px] text-text-muted">&mdash; Shell plc CEO</div>
            </div>

            {/* Shipping */}
            <div className="font-mono text-[10px] text-text-muted tracking-[1px] uppercase mb-1 mt-3">Shipping</div>
            <div className="space-y-1">
              <Row label="Hormuz status" value="HALTED" valueColor="#ff3b5c" />
              <Row label="Ships stranded" value={market.shipping.ships_stranded.toString()} valueColor="#ff8c42" />
              <Row label="Insurance" value="SUSPENDED" valueColor="#ff3b5c" />
            </div>

            {/* Insider Trading */}
            <div className="mt-3 px-2 py-1.5 border border-danger/30 bg-danger/05">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-danger text-[14px] font-bold">&#x26A0;</span>
                <span className="font-mono text-[11px] font-bold text-danger tracking-[1px]">INSIDER TRADING</span>
              </div>
              <div className="font-mono text-[12px] text-white font-bold">
                {fmtB(market.insiderTrading.amount)} short bets on oil futures
              </div>
              <div className="font-mono text-[10px] text-text-dim mt-0.5">
                Placed <span className="text-danger font-bold">15 MINUTES</span> before Trump announced postponing attacks for talks
              </div>
              <div className="font-mono text-[9px] text-text-muted mt-0.5">
                {market.insiderTrading.date} &mdash; {market.insiderTrading.source}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Classification footer */}
      <div className="bg-[#1a0a0a] border-t border-danger/30 px-4 py-1.5 text-center">
        <span className="font-mono text-[10px] text-danger/70 tracking-[2px]">
          TOP SECRET // NOFORN // ECONOMIC INTELLIGENCE
        </span>
      </div>
    </div>
  );
}
