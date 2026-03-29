"use client";

import { useState } from "react";
import LeaderCard from "./LeaderCard";
import type { LeaderCardData } from "./LeaderCard";

interface LeadershipDossierProps {
  leaders: LeaderCardData[];
  onSelectLeader: (leader: LeaderCardData) => void;
}

const STATUS_COLORS: Record<string, string> = {
  ELIMINATED: "#ff3b5c",
  SURVIVED: "#22f5b0",
  ALIVE: "#22f5b0",
  UNKNOWN: "#ffb830",
  FLED: "#ff8c42",
};

function formatMilDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, "0");
    const mon = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const year = d.getFullYear();
    return `${day} ${mon} ${year}`;
  } catch {
    return dateStr;
  }
}

export default function LeadershipDossier({
  leaders,
  onSelectLeader,
}: LeadershipDossierProps) {
  const [filter, setFilter] = useState<string>("all");
  const [selectedLeader, setSelectedLeader] = useState<LeaderCardData | null>(
    null,
  );

  const eliminated = leaders.filter((l) => l.status === "ELIMINATED");
  const alive = leaders.filter(
    (l) => l.status === "ALIVE" || l.status === "SURVIVED",
  );
  const unknown = leaders.filter(
    (l) => l.status === "UNKNOWN" || l.status === "FLED",
  );

  const filtered =
    filter === "all"
      ? leaders
      : filter === "eliminated"
        ? eliminated
        : filter === "alive"
          ? alive
          : unknown;

  const sorted = [...filtered].sort((a, b) => {
    const impOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
    };
    const aImp = impOrder[a.importance as string] ?? 3;
    const bImp = impOrder[b.importance as string] ?? 3;
    if (aImp !== bImp) return aImp - bImp;
    if (a.date && b.date)
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (a.date) return -1;
    return 1;
  });

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#060810",
        position: "relative",
      }}
    >
      {/* EYES ONLY watermark */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(-35deg)",
          fontFamily: "var(--font-heading), 'Rajdhani', sans-serif",
          fontSize: "80px",
          fontWeight: 900,
          color: "rgba(255,59,92,0.015)",
          letterSpacing: "20px",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 0,
        }}
      >
        EYES ONLY
      </div>

      {/* CLASSIFIED header bar */}
      <div
        style={{
          padding: "8px 14px",
          background: "rgba(255,59,92,0.04)",
          borderBottom: "1px solid rgba(255,59,92,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              fontFamily: "var(--font-mono), 'Inconsolata', monospace",
              fontSize: "9px",
              letterSpacing: "3px",
              color: "#ff3b5c",
              fontWeight: 700,
              padding: "2px 8px",
              border: "1px solid rgba(255,59,92,0.3)",
              background: "rgba(255,59,92,0.06)",
            }}
          >
            TOP SECRET // NOFORN
          </div>
          <span
            style={{
              fontFamily: "var(--font-mono), 'Inconsolata', monospace",
              fontSize: "9px",
              color: "#8b949e",
              letterSpacing: "1px",
            }}
          >
            LEADERSHIP TARGET STATUS
          </span>
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono), 'Inconsolata', monospace",
            fontSize: "9px",
            color: "#7d8590",
          }}
        >
          {leaders.length} TRACKED
        </span>
      </div>

      {/* Summary stats bar */}
      <div
        style={{
          padding: "8px 14px",
          borderBottom: "1px solid rgba(0,210,170,0.06)",
          display: "flex",
          gap: "12px",
          zIndex: 1,
        }}
      >
        <StatBadge
          label="ELIMINATED"
          count={eliminated.length}
          color="#ff3b5c"
          active={filter === "eliminated"}
          onClick={() =>
            setFilter(filter === "eliminated" ? "all" : "eliminated")
          }
        />
        <StatBadge
          label="ALIVE"
          count={alive.length}
          color="#22f5b0"
          active={filter === "alive"}
          onClick={() => setFilter(filter === "alive" ? "all" : "alive")}
        />
        <StatBadge
          label="UNKNOWN"
          count={unknown.length}
          color="#ffb830"
          active={filter === "unknown"}
          onClick={() => setFilter(filter === "unknown" ? "all" : "unknown")}
        />
        <StatBadge
          label="ALL"
          count={leaders.length}
          color="#8b949e"
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
      </div>

      {/* Leader cards */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1px",
          padding: "4px",
          zIndex: 1,
        }}
      >
        {sorted.map((leader, idx) => (
          <LeaderCard
            key={`${leader.name}-${idx}`}
            leader={leader}
            refId={`REF: PAH-IR-2026-${String(idx + 1).padStart(4, "0")}`}
            onClick={() => {
              setSelectedLeader(leader);
            }}
          />
        ))}
      </div>

      {/* Classification footer */}
      <div
        style={{
          padding: "4px 14px",
          borderTop: "1px solid rgba(255,59,92,0.08)",
          textAlign: "center",
          zIndex: 1,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono), 'Inconsolata', monospace",
            fontSize: "9px",
            letterSpacing: "2px",
            color: "#ff3b5c40",
          }}
        >
          TOP SECRET // NOFORN // ORCON
        </span>
      </div>

      {/* Detail modal overlay */}
      {selectedLeader && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
          onClick={() => setSelectedLeader(null)}
        >
          <div
            style={{
              background: "#0a0d10",
              border: "1px solid rgba(255,59,92,0.12)",
              padding: "20px",
              maxWidth: "400px",
              width: "90%",
              maxHeight: "90%",
              overflowY: "auto",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedLeader(null)}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: "none",
                border: "none",
                color: "#8b949e",
                cursor: "pointer",
                fontFamily: "var(--font-mono), monospace",
                fontSize: "14px",
              }}
            >
              &#10005;
            </button>

            {/* Classification header */}
            <div
              style={{
                textAlign: "center",
                marginBottom: "16px",
                padding: "4px",
                background: "rgba(255,59,92,0.04)",
                border: "1px solid rgba(255,59,92,0.1)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono), 'Inconsolata', monospace",
                  fontSize: "9px",
                  letterSpacing: "3px",
                  color: "#ff3b5c",
                }}
              >
                SUBJECT DOSSIER // TOP SECRET
              </span>
            </div>

            {/* Large photo with status overlay */}
            <div
              style={{
                width: "120px",
                height: "160px",
                margin: "0 auto 16px",
                position: "relative",
                border: "2px solid rgba(255,59,92,0.2)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  selectedLeader.photo || "/images/leaders/placeholder.svg"
                }
                alt={selectedLeader.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter:
                    selectedLeader.status === "ELIMINATED"
                      ? "grayscale(100%) brightness(0.6)"
                      : "none",
                }}
              />

              {/* Scan lines */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background:
                    "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
                  pointerEvents: "none",
                }}
              />

              {selectedLeader.status === "ELIMINATED" && (
                <>
                  {/* Big red X */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(255,59,92,0.1)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "80px",
                        fontWeight: 900,
                        color: "#ff3b5c",
                        textShadow: "0 0 20px rgba(255,59,92,0.4)",
                        fontFamily:
                          "var(--font-heading), 'Rajdhani', sans-serif",
                        opacity: 0.7,
                      }}
                    >
                      &#10005;
                    </span>
                  </div>
                  {/* ELIMINATED stamp across photo */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "8px",
                      left: "-4px",
                      right: "-4px",
                      background: "rgba(255,59,92,0.85)",
                      padding: "2px 0",
                      textAlign: "center",
                      transform: "rotate(-5deg)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily:
                          "var(--font-mono), 'Inconsolata', monospace",
                        fontSize: "9px",
                        letterSpacing: "3px",
                        color: "#fff",
                        fontWeight: 700,
                      }}
                    >
                      ELIMINATED
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Name and role */}
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <div
                style={{
                  fontFamily:
                    "var(--font-heading), 'Rajdhani', sans-serif",
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#e6edf3",
                }}
              >
                {selectedLeader.name}
              </div>
              <div
                style={{
                  fontFamily:
                    "var(--font-mono), 'Inconsolata', monospace",
                  fontSize: "9px",
                  color: "#8b949e",
                  letterSpacing: "1px",
                  marginTop: "4px",
                }}
              >
                {selectedLeader.role}
              </div>
            </div>

            {/* Data rows */}
            <div
              style={{
                borderTop: "1px solid rgba(0,210,170,0.06)",
                paddingTop: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <DossierRow
                label="STATUS"
                value={selectedLeader.status}
                valueColor={
                  STATUS_COLORS[selectedLeader.status] || "#8b949e"
                }
              />
              {selectedLeader.date && (
                <DossierRow
                  label="DATE"
                  value={formatMilDate(selectedLeader.date)}
                />
              )}
              {selectedLeader.location && (
                <DossierRow
                  label="LOCATION"
                  value={selectedLeader.location}
                />
              )}
              {selectedLeader.killedBy && (
                <DossierRow
                  label="STRIKE BY"
                  value={selectedLeader.killedBy}
                />
              )}
              {selectedLeader.successor && (
                <DossierRow
                  label="SUCCESSOR"
                  value={selectedLeader.successor}
                />
              )}
              {selectedLeader.importance && (
                <DossierRow
                  label="PRIORITY"
                  value={selectedLeader.importance.toUpperCase()}
                  valueColor={
                    selectedLeader.importance === "critical"
                      ? "#ff3b5c"
                      : selectedLeader.importance === "high"
                        ? "#ffb830"
                        : "#8b949e"
                  }
                />
              )}
            </div>

            {/* Details paragraph */}
            {selectedLeader.details && (
              <div
                style={{
                  marginTop: "12px",
                  paddingTop: "12px",
                  borderTop: "1px solid rgba(0,210,170,0.06)",
                  fontFamily:
                    "var(--font-mono), 'Inconsolata', monospace",
                  fontSize: "9px",
                  color: "#6b7b8d",
                  lineHeight: 1.5,
                }}
              >
                {selectedLeader.details}
              </div>
            )}

            {/* VIEW ON MAP button */}
            <button
              onClick={() => {
                onSelectLeader(selectedLeader);
                setSelectedLeader(null);
              }}
              style={{
                marginTop: "16px",
                width: "100%",
                padding: "6px 0",
                background: "rgba(56,139,253,0.1)",
                border: "1px solid rgba(56,139,253,0.3)",
                color: "#388bfd",
                fontFamily:
                  "var(--font-mono), 'Inconsolata', monospace",
                fontSize: "9px",
                letterSpacing: "2px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.1s",
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(56,139,253,0.2)";
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(56,139,253,0.1)";
              }}
            >
              VIEW ON MAP
            </button>

            {/* Classification footer */}
            <div
              style={{
                marginTop: "16px",
                textAlign: "center",
                padding: "4px",
                borderTop: "1px solid rgba(255,59,92,0.06)",
              }}
            >
              <span
                style={{
                  fontFamily:
                    "var(--font-mono), 'Inconsolata', monospace",
                  fontSize: "9px",
                  letterSpacing: "2px",
                  color: "#ff3b5c40",
                }}
              >
                CLASSIFIED // NOFORN
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBadge({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 8px",
        background: active ? `${color}15` : "transparent",
        border: `1px solid ${active ? `${color}40` : "rgba(0,210,170,0.06)"}`,
        borderRadius: "1px",
        cursor: "pointer",
        transition: "all 0.1s",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono), 'Inconsolata', monospace",
          fontSize: "9px",
          letterSpacing: "0.5px",
          color: active ? color : "#8b949e",
          fontWeight: active ? 700 : 400,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono), 'Inconsolata', monospace",
          fontSize: "10px",
          fontWeight: 700,
          color: active ? color : "#8b949e",
        }}
      >
        {count}
      </span>
    </button>
  );
}

function DossierRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "2px 0",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono), 'Inconsolata', monospace",
          fontSize: "9px",
          color: "#7d8590",
          letterSpacing: "1px",
          minWidth: "80px",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono), 'Inconsolata', monospace",
          fontSize: "10px",
          color: valueColor || "#c9d1d9",
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}
