"use client";

interface BottomBarProps {
  enabledLayers: number;
  totalPoints: number;
  zoom?: number;
  coords?: { lat: number; lng: number } | null;
  onQuickNav?: (lat: number, lng: number, zoom: number) => void;
}

const QUICK_NAV = [
  { label: "US", lat: 39.5, lng: -98.35, zoom: 5 },
  { label: "NJ", lat: 40.0583, lng: -74.4057, zoom: 8 },
  { label: "NYC", lat: 40.7128, lng: -74.006, zoom: 11 },
  { label: "FREEHOLD", lat: 40.2593, lng: -74.2735, zoom: 13 },
  { label: "NEWARK", lat: 40.7357, lng: -74.1724, zoom: 12 },
  { label: "AC", lat: 39.3643, lng: -74.4229, zoom: 12 },
  { label: "PHL", lat: 39.9526, lng: -75.1652, zoom: 11 },
  { label: "DC", lat: 38.9072, lng: -77.0369, zoom: 11 },
  { label: "ATL", lat: 33.749, lng: -84.388, zoom: 10 },
  { label: "LA", lat: 34.0522, lng: -118.2437, zoom: 10 },
  { label: "GULF", lat: 27.0, lng: -90.0, zoom: 6 },
];

export default function BottomBar({
  enabledLayers,
  totalPoints,
  zoom,
  coords,
  onQuickNav,
}: BottomBarProps) {
  return (
    <div className="h-[34px] bg-surface border-t border-border flex items-center justify-between px-4 shrink-0 select-none relative">
      {/* Teal accent line — left-aligned gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(to left, transparent 50%, rgba(0,212,170,0.3) 100%)",
        }}
      />

      {/* Left: Coordinates */}
      <div className="flex items-center gap-2 font-mono text-[12px] text-text-dim min-w-[160px]">
        {coords ? (
          <>
            <span className="text-accent">{coords.lat.toFixed(5)}</span>
            <span className="text-text-muted">,</span>
            <span className="text-accent">{coords.lng.toFixed(5)}</span>
          </>
        ) : (
          <span className="text-text-muted">NO POSITION</span>
        )}
        {zoom !== undefined && (
          <span className="text-text-muted ml-1">Z{zoom}</span>
        )}
      </div>

      {/* Center: Quick Nav */}
      {onQuickNav && (
        <div className="flex items-center gap-0.5">
          {QUICK_NAV.map((nav) => (
            <button
              key={nav.label}
              onClick={() => onQuickNav(nav.lat, nav.lng, nav.zoom)}
              className="px-1.5 py-0.5 text-[12px] font-heading tracking-[1px] text-text-dim hover:text-accent hover:bg-accent-glow transition-colors"
            >
              {nav.label}
            </button>
          ))}
        </div>
      )}

      {/* Right: Stats */}
      <div className="flex items-center gap-3 font-mono text-[12px] text-text-dim min-w-[160px] justify-end">
        <span>
          <span className="text-white">{enabledLayers}</span> LAYERS
        </span>
        <span className="text-text-muted">|</span>
        <span>
          <span className="text-white">{totalPoints.toLocaleString()}</span> PTS
        </span>
      </div>
    </div>
  );
}
