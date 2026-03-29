"use client";

export interface LeaderCardData {
  name: string;
  role: string;
  status: "ELIMINATED" | "SURVIVED" | "ALIVE" | "UNKNOWN" | "FLED";
  date?: string | null;
  photo?: string;
  killedBy?: string | null;
  details?: string;
  successor?: string;
  importance?: string;
  location?: string;
}

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; border: string; stamp: string }
> = {
  ELIMINATED: {
    color: "#ff3b5c",
    bg: "rgba(255,59,92,0.06)",
    border: "rgba(255,59,92,0.2)",
    stamp: "ELIMINATED",
  },
  SURVIVED: {
    color: "#22f5b0",
    bg: "rgba(34,245,176,0.04)",
    border: "rgba(34,245,176,0.15)",
    stamp: "SURVIVED",
  },
  ALIVE: {
    color: "#22f5b0",
    bg: "rgba(34,245,176,0.03)",
    border: "rgba(34,245,176,0.1)",
    stamp: "ALIVE",
  },
  UNKNOWN: {
    color: "#ffb830",
    bg: "rgba(255,184,48,0.04)",
    border: "rgba(255,184,48,0.15)",
    stamp: "UNKNOWN",
  },
  FLED: {
    color: "#ff8c42",
    bg: "rgba(255,140,66,0.04)",
    border: "rgba(255,140,66,0.15)",
    stamp: "FLED",
  },
};

export default function LeaderCard({
  leader,
  onClick,
  refId,
}: {
  leader: LeaderCardData;
  onClick?: () => void;
  refId?: string;
}) {
  const config = STATUS_CONFIG[leader.status] || STATUS_CONFIG.UNKNOWN;

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        gap: "12px",
        padding: "12px",
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderLeft: `3px solid ${config.color}`,
        cursor: "pointer",
        transition: "all 0.12s",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          config.bg.replace(/0\.\d+\)$/, "0.12)");
        (e.currentTarget as HTMLElement).style.borderColor = config.color;
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLElement).style.background = config.bg;
        (e.currentTarget as HTMLElement).style.borderColor = config.border;
      }}
    >
      {/* Photo */}
      <div
        style={{
          width: "56px",
          height: "72px",
          flexShrink: 0,
          position: "relative",
          borderRadius: "2px",
          overflow: "hidden",
          border: `1px solid ${config.border}`,
          background: "#0d1117",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={leader.photo || "/images/leaders/placeholder.svg"}
          alt={leader.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter:
              leader.status === "ELIMINATED"
                ? "grayscale(100%) contrast(1.2) brightness(0.7)"
                : leader.status === "UNKNOWN"
                  ? "grayscale(50%) brightness(0.8)"
                  : "none",
          }}
        />

        {/* Scan line effect */}
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

        {/* RED X STAMP over eliminated leaders */}
        {leader.status === "ELIMINATED" && (
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
              background: "rgba(255,59,92,0.15)",
            }}
          >
            <span
              style={{
                fontSize: "36px",
                fontWeight: 900,
                color: "#ff3b5c",
                textShadow: "0 0 8px rgba(255,59,92,0.5)",
                fontFamily: "var(--font-heading), 'Rajdhani', sans-serif",
                lineHeight: 1,
                opacity: 0.85,
              }}
            >
              &#10005;
            </span>
          </div>
        )}

        {/* Importance badge */}
        {leader.importance === "critical" && (
          <div
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              width: "8px",
              height: "8px",
              background: config.color,
              borderRadius: "1px",
              boxShadow: `0 0 4px ${config.color}`,
            }}
          />
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name */}
        <div
          style={{
            fontFamily: "var(--font-heading), 'Rajdhani', sans-serif",
            fontSize: "13px",
            fontWeight: 700,
            color: "#e6edf3",
            lineHeight: 1.2,
            marginBottom: "2px",
          }}
        >
          {leader.name}
        </div>

        {/* Role */}
        <div
          style={{
            fontFamily: "var(--font-mono), 'Inconsolata', monospace",
            fontSize: "9px",
            color: "#8b949e",
            letterSpacing: "0.3px",
            lineHeight: 1.3,
            marginBottom: "6px",
          }}
        >
          {leader.role}
        </div>

        {/* Status badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "2px 6px",
            background: `${config.color}10`,
            border: `1px solid ${config.color}25`,
            borderRadius: "1px",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono), 'Inconsolata', monospace",
              fontSize: "9px",
              fontWeight: 700,
              color: config.color,
              letterSpacing: "1px",
            }}
          >
            {config.stamp}
          </span>
        </div>

        {/* Date */}
        {leader.date && (
          <div
            style={{
              fontFamily: "var(--font-mono), 'Inconsolata', monospace",
              fontSize: "9px",
              color: "#768390",
              marginTop: "4px",
              letterSpacing: "0.5px",
            }}
          >
            {new Date(leader.date).toLocaleDateString("en-US", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }).toUpperCase()}
            {leader.killedBy && ` \u2014 ${leader.killedBy}`}
          </div>
        )}

        {/* Successor */}
        {leader.successor && (
          <div
            style={{
              fontFamily: "var(--font-mono), 'Inconsolata', monospace",
              fontSize: "9px",
              color: "#7d8590",
              marginTop: "3px",
            }}
          >
            SUCCESSOR: {leader.successor}
          </div>
        )}
      </div>

      {/* Classification stripe at top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background:
            leader.importance === "critical" ? config.color : "transparent",
        }}
      />

      {/* Ref number */}
      {refId && (
        <div
          style={{
            position: "absolute",
            bottom: 2,
            right: 4,
            fontFamily: "var(--font-mono), 'Inconsolata', monospace",
            fontSize: "6px",
            color: "#2a3444",
            letterSpacing: "0.5px",
          }}
        >
          {refId}
        </div>
      )}
    </div>
  );
}
