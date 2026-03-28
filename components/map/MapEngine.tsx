"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import type { LayerConfig } from "@/components/layout/Sidebar";
import { HIFLD_LAYERS } from "@/lib/hifld";

const TILE_URLS: Record<string, { url: string; attribution: string }> = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, Maxar, Earthstar Geographics",
  },
  topo: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
};

export interface CameraData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  imageUrl?: string | null;
  streamUrl?: string | null;
  road?: string;
  direction?: string;
  county?: string;
  state?: string;
  source?: string;
  inService?: boolean;
  feedUrl?: string;
}

export interface CableData {
  type: "FeatureCollection";
  features: GeoJSON.Feature[];
}

interface MapEngineProps {
  layers: LayerConfig[];
  cameras: CameraData[];
  cableData: CableData | null;
  layerData: Record<string, GeoJSON.FeatureCollection>;
  onCameraClick?: (camera: CameraData) => void;
  navRef?: MutableRefObject<{ flyTo: (lat: number, lng: number, zoom: number) => void } | null>;
}

function proxyImageUrl(url: string): string {
  return `/api/camera-image?url=${encodeURIComponent(url)}`;
}

function buildPopupHtml(cam: CameraData): string {
  const imgSrc = cam.imageUrl || cam.feedUrl;
  const proxiedSrc = imgSrc ? proxyImageUrl(imgSrc) : null;
  const timestamp = Date.now();

  return `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;min-width:280px;">
    <div style="color:#00d4aa;font-weight:bold;margin-bottom:4px;font-size:12px;">${cam.name}</div>
    <div style="color:#6a6a7a;margin-bottom:6px;display:flex;gap:8px;flex-wrap:wrap;">
      ${cam.road ? `<span>Route ${cam.road}</span>` : ""}
      ${cam.direction ? `<span>${cam.direction}</span>` : ""}
      ${cam.county ? `<span>${cam.county} Co.</span>` : ""}
      ${cam.state ? `<span style="color:#40e8c4;">${cam.state}</span>` : ""}
    </div>
    ${
      proxiedSrc
        ? `<div style="position:relative;margin-top:4px;">
            <img
              id="cam-img-${cam.id}"
              src="${proxiedSrc}&t=${timestamp}"
              style="width:300px;border-radius:1px;border:1px solid rgba(0,210,170,0.14);display:block;background:#12121a;"
              onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='flex';"
            />
            <div style="display:none;width:300px;height:180px;border-radius:1px;border:1px solid rgba(0,210,170,0.14);background:#12121a;align-items:center;justify-content:center;color:#ff3355;font-size:10px;">
              FEED UNAVAILABLE
            </div>
            <div style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.7);border-radius:1px;padding:2px 6px;font-size:9px;color:#00d4aa;">
              LIVE
            </div>
          </div>
          <div style="margin-top:6px;display:flex;gap:6px;align-items:center;">
            <button onclick="(function(){var img=document.getElementById('cam-img-${cam.id}');if(img)img.src='${proxiedSrc}&t='+Date.now();})()" style="background:#13181d;border:1px solid rgba(0,210,170,0.14);color:#00d4aa;padding:3px 8px;border-radius:1px;font-size:10px;cursor:pointer;font-family:monospace;">
              ↻ REFRESH
            </button>
            ${
              cam.streamUrl
                ? `<span style="background:#13181d;border:1px solid rgba(0,210,170,0.14);color:#40e8c4;padding:3px 8px;border-radius:1px;font-size:10px;font-family:monospace;">
                    ▶ STREAM — click marker for panel
                  </span>`
                : ""
            }
            <span style="margin-left:auto;font-size:9px;color:#6a6a7a;">${cam.source || ""}</span>
          </div>`
        : '<div style="color:#6a6a7a;margin-top:4px;font-size:10px;">No feed URL available</div>'
    }
  </div>`;
}

// Auto-refresh interval for open popups
const REFRESH_INTERVALS = new Map<string, ReturnType<typeof setInterval>>();

function startAutoRefresh(camId: string, baseUrl: string) {
  stopAutoRefresh(camId);
  const interval = setInterval(() => {
    const img = document.getElementById(`cam-img-${camId}`) as HTMLImageElement | null;
    if (img) {
      img.src = `${proxyImageUrl(baseUrl)}&t=${Date.now()}`;
    }
  }, 10000);
  REFRESH_INTERVALS.set(camId, interval);
}

function stopAutoRefresh(camId: string) {
  const existing = REFRESH_INTERVALS.get(camId);
  if (existing) {
    clearInterval(existing);
    REFRESH_INTERVALS.delete(camId);
  }
}

// Build popup for HIFLD/GeoJSON features
function buildFeaturePopup(feature: GeoJSON.Feature, layerConfig: LayerConfig): string {
  const props = feature.properties || {};
  const hifldConfig = HIFLD_LAYERS.find((l) => l.id === layerConfig.id);
  const fields = hifldConfig?.popupFields || Object.keys(props).slice(0, 6);

  const title =
    props.NAME || props.PNAME || props.DAM_NAME || props.FACILITY_C ||
    props.COMPANY || props.LICENSEE || props.name || props.title ||
    layerConfig.name;

  const rows = fields
    .filter((f) => props[f] != null && props[f] !== "" && f !== "OBJECTID" && f !== "FID")
    .map(
      (f) =>
        `<div style="display:flex;justify-content:space-between;gap:8px;">
          <span style="color:#6a6a7a;text-transform:uppercase;font-size:9px;">${f.replace(/_/g, " ")}</span>
          <span style="color:#9aa8b4;text-align:right;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${props[f]}</span>
        </div>`
    )
    .join("");

  return `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;min-width:200px;">
    <div style="color:${layerConfig.color};font-weight:bold;margin-bottom:6px;font-size:11px;">${title}</div>
    <div style="display:flex;flex-direction:column;gap:3px;">${rows}</div>
  </div>`;
}

// Build earthquake popup
function buildEarthquakePopup(feature: GeoJSON.Feature): string {
  const props = feature.properties || {};
  const mag = props.mag || "?";
  const place = props.place || "Unknown location";
  const time = props.time ? new Date(props.time).toLocaleString() : "";

  return `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;min-width:200px;">
    <div style="color:#ff2b4e;font-weight:bold;font-size:13px;margin-bottom:4px;">M${mag}</div>
    <div style="color:#9aa8b4;margin-bottom:4px;">${place}</div>
    <div style="color:#6a6a7a;font-size:9px;">${time}</div>
    ${props.tsunami ? '<div style="color:#f5a623;margin-top:4px;font-size:9px;">TSUNAMI WARNING</div>' : ""}
  </div>`;
}

export default function MapEngine({
  layers,
  cameras,
  cableData,
  layerData,
  onCameraClick,
  navRef,
}: MapEngineProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraClusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const cableLayerRef = useRef<L.GeoJSON | null>(null);
  const dynamicLayersRef = useRef<Map<string, L.LayerGroup>>(new Map());
  const [mapStyle, setMapStyle] = useState<string>("dark");
  const [stats, setStats] = useState({ cameras: 0, layers: 0, points: 0 });

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [39.5, -98.35],
      zoom: 5,
      zoomControl: true,
      attributionControl: true,
    });

    const tileConfig = TILE_URLS[mapStyle];
    L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Expose nav ref
    if (navRef) {
      navRef.current = {
        flyTo: (lat: number, lng: number, zoom: number) => {
          map.flyTo([lat, lng], zoom, { duration: 1.5 });
        },
      };
    }

    // Cluster group
    cameraClusterRef.current = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let radius = 28;
        if (count > 100) radius = 40;
        else if (count > 30) radius = 34;

        return L.divIcon({
          html: `<div style="
            width:${radius}px;height:${radius}px;
            border-radius:50%;
            background:rgba(0,212,170,0.1);
            border:1px solid rgba(0,212,170,0.4);
            display:flex;align-items:center;justify-content:center;
            color:#00d4aa;font-size:10px;font-weight:600;font-family:'Inconsolata',monospace;
            box-shadow:0 0 8px rgba(0,212,170,0.15);
          ">${count}</div>`,
          className: "",
          iconSize: L.point(radius, radius),
        });
      },
    }).addTo(map);

    cableLayerRef.current = L.geoJSON(undefined, {
      style: {
        color: "#40e8c4",
        weight: 2,
        opacity: 0.6,
      },
      onEachFeature: (feature, layer) => {
        if (feature.properties?.name) {
          layer.bindPopup(
            `<div style="font-family:monospace;font-size:11px;">
              <div style="color:#40e8c4;font-weight:bold;">${feature.properties.name}</div>
              ${feature.properties.owners ? `<div style="color:#6a6a7a;margin-top:2px;">${feature.properties.owners}</div>` : ""}
              ${feature.properties.length ? `<div style="color:#6a6a7a;margin-top:2px;">${feature.properties.length}</div>` : ""}
            </div>`,
            { maxWidth: 300 }
          );
        }
      },
    }).addTo(map);

    map.on("popupclose", () => {
      REFRESH_INTERVALS.forEach((_, camId) => stopAutoRefresh(camId));
    });

    return () => {
      REFRESH_INTERVALS.forEach((_, camId) => stopAutoRefresh(camId));
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Camera layer
  useEffect(() => {
    const cluster = cameraClusterRef.current;
    if (!cluster) return;
    cluster.clearLayers();

    const camerasEnabled = layers.find((l) => l.id === "cameras")?.enabled;
    if (!camerasEnabled) return;

    const cameraIcon = L.divIcon({
      className: "",
      html: `<div style="width:8px;height:8px;border-radius:50%;background:#ff3b3b;box-shadow:0 0 6px #ff3b3b;"></div>`,
      iconSize: [8, 8],
      iconAnchor: [4, 4],
    });

    const markers: L.Marker[] = [];

    cameras.forEach((cam) => {
      const marker = L.marker([cam.lat, cam.lng], { icon: cameraIcon });

      marker.bindPopup(buildPopupHtml(cam), {
        maxWidth: 340,
        minWidth: 300,
        className: "war-room-popup",
      });

      marker.on("popupopen", () => {
        const imgSrc = cam.imageUrl || cam.feedUrl;
        if (imgSrc) startAutoRefresh(cam.id, imgSrc);
      });

      marker.on("popupclose", () => {
        stopAutoRefresh(cam.id);
      });

      if (onCameraClick) {
        marker.on("click", () => onCameraClick(cam));
      }

      markers.push(marker);
    });

    cluster.addLayers(markers);
    setStats((prev) => ({ ...prev, cameras: cameras.length }));
  }, [cameras, layers, onCameraClick]);

  // Cable layer
  useEffect(() => {
    const layer = cableLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    const cablesEnabled = layers.find((l) => l.id === "cables")?.enabled;
    if (!cablesEnabled || !cableData) return;

    layer.addData(cableData);
  }, [cableData, layers]);

  // Dynamic HIFLD / earthquake / wildfire layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let totalPoints = cameras.length;

    // Process each dynamic layer
    layers.forEach((layerConfig) => {
      // Skip camera and cable layers (handled separately)
      if (layerConfig.id === "cameras" || layerConfig.id === "cables") return;

      const existingLayer = dynamicLayersRef.current.get(layerConfig.id);
      const data = layerData[layerConfig.id];

      // Remove layer if disabled
      if (!layerConfig.enabled) {
        if (existingLayer) {
          map.removeLayer(existingLayer);
          dynamicLayersRef.current.delete(layerConfig.id);
        }
        return;
      }

      // Add layer if enabled and data available
      if (!data || !data.features) return;

      // Don't re-add if already on map
      if (existingLayer) {
        totalPoints += data.features.length;
        return;
      }

      const isLineLayer =
        layerConfig.id === "gas-pipelines" ||
        layerConfig.id === "transmission-lines";

      const isEarthquake = layerConfig.id === "earthquakes";
      const isWildfire = layerConfig.id === "wildfires";
      const isOsmCameras = layerConfig.id === "osm-cameras";
      const isAlpr = layerConfig.id === "alpr";
      const isWeatherAlerts = layerConfig.id === "weather-alerts";
      const isEffAtlas = layerConfig.id.startsWith("eff-");
      const isDeflock = layerConfig.id === "deflock-alpr";

      let newLayer: L.LayerGroup;

      if (isLineLayer) {
        // Line/polyline layers
        newLayer = L.geoJSON(data, {
          style: {
            color: layerConfig.color,
            weight: 1.5,
            opacity: 0.5,
          },
          onEachFeature: (feature, layer) => {
            layer.bindPopup(buildFeaturePopup(feature, layerConfig), {
              maxWidth: 280,
            });
          },
        });
      } else if (isWildfire) {
        // Polygon layers for wildfires
        newLayer = L.geoJSON(data, {
          style: {
            color: "#f5a623",
            fillColor: "#f5a623",
            fillOpacity: 0.2,
            weight: 2,
            opacity: 0.7,
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            const name = props.poly_IncidentName || props.irwin_IncidentName || "Wildfire";
            const acres = props.poly_GISAcres ? Math.round(props.poly_GISAcres).toLocaleString() : "?";
            layer.bindPopup(
              `<div style="font-family:monospace;font-size:10px;">
                <div style="color:#f5a623;font-weight:bold;font-size:12px;">${name}</div>
                <div style="color:#9aa8b4;margin-top:4px;">${acres} acres</div>
              </div>`,
              { maxWidth: 250 }
            );
          },
        });
      } else if (isWeatherAlerts) {
        // NOAA weather alert polygons
        newLayer = L.geoJSON(data, {
          style: (feature) => {
            const severity = feature?.properties?.severity || "";
            const color =
              severity === "Extreme" ? "#ff2b4e" :
              severity === "Severe" ? "#f5a623" :
              severity === "Moderate" ? "#00b4ff" : "#8b5cf6";
            return {
              color,
              fillColor: color,
              fillOpacity: 0.15,
              weight: 2,
              opacity: 0.6,
            };
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            const event = props.event || "Weather Alert";
            const headline = props.headline || "";
            const severity = props.severity || "";
            const urgency = props.urgency || "";
            const areas = props.areaDesc || "";
            layer.bindPopup(
              `<div style="font-family:monospace;font-size:10px;min-width:220px;">
                <div style="color:${severity === "Extreme" ? "#ff2b4e" : severity === "Severe" ? "#f5a623" : "#00b4ff"};font-weight:bold;font-size:12px;">${event}</div>
                <div style="color:#9aa8b4;margin-top:4px;font-size:10px;">${headline}</div>
                <div style="color:#6a6a7a;margin-top:4px;font-size:9px;">Severity: ${severity} · Urgency: ${urgency}</div>
                <div style="color:#6a6a7a;margin-top:2px;font-size:9px;max-height:60px;overflow:auto;">${areas}</div>
              </div>`,
              { maxWidth: 300 }
            );
          },
        });
      } else if (isEarthquake) {
        // Earthquake circle markers scaled by magnitude
        newLayer = L.geoJSON(data, {
          pointToLayer: (feature, latlng) => {
            const mag = feature.properties?.mag || 1;
            const radius = Math.max(3, mag * 3);
            return L.circleMarker(latlng, {
              radius,
              fillColor: mag >= 5 ? "#ff2b4e" : mag >= 3 ? "#f5a623" : "#8b5cf6",
              color: "transparent",
              fillOpacity: 0.7,
            });
          },
          onEachFeature: (feature, layer) => {
            layer.bindPopup(buildEarthquakePopup(feature), { maxWidth: 250 });
          },
        });
      } else if (isOsmCameras) {
        // OSM surveillance cameras — small gray dots (location only, no feeds)
        newLayer = L.geoJSON(data, {
          pointToLayer: (_feature, latlng) => {
            return L.circleMarker(latlng, {
              radius: 5,
              fillColor: "#b0b0c0",
              color: "#d0d0e0",
              fillOpacity: 0.9,
              weight: 1.5,
              opacity: 0.8,
            });
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            const zone = props.zone !== "unknown" ? props.zone : "";
            const cameraType = props.cameraType !== "unknown" ? props.cameraType : "";
            const operator = props.operator !== "Unknown" ? props.operator : "";
            layer.bindPopup(
              `<div style="font-family:monospace;font-size:10px;min-width:180px;">
                <div style="color:#8a8a9a;font-weight:bold;font-size:11px;">STREET / MUNICIPAL CAMERA</div>
                ${zone ? `<div style="color:#9aa8b4;margin-top:3px;">Zone: ${zone}</div>` : ""}
                ${cameraType ? `<div style="color:#9aa8b4;">Type: ${cameraType}</div>` : ""}
                ${operator ? `<div style="color:#9aa8b4;">Operator: ${operator}</div>` : ""}
                ${props.direction ? `<div style="color:#9aa8b4;">Direction: ${props.direction}</div>` : ""}
                <div style="color:#5c6c78;margin-top:4px;font-size:9px;">Source: OpenStreetMap</div>
              </div>`,
              { maxWidth: 250 }
            );
          },
        });
      } else if (isAlpr) {
        // ALPR / License Plate Readers — blue diamond markers
        newLayer = L.geoJSON(data, {
          pointToLayer: (_feature, latlng) => {
            return L.circleMarker(latlng, {
              radius: 4,
              fillColor: "#00b4ff",
              color: "#00b4ff",
              fillOpacity: 0.8,
              weight: 1,
              opacity: 0.9,
            });
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            const operator = props.operator !== "Unknown" ? props.operator : "";
            layer.bindPopup(
              `<div style="font-family:monospace;font-size:10px;min-width:180px;">
                <div style="color:#00b4ff;font-weight:bold;font-size:11px;">LICENSE PLATE READER</div>
                ${operator ? `<div style="color:#9aa8b4;margin-top:3px;">Operator: ${operator}</div>` : ""}
                ${props.direction ? `<div style="color:#9aa8b4;">Direction: ${props.direction}</div>` : ""}
                <div style="color:#5c6c78;margin-top:4px;font-size:9px;">Source: OpenStreetMap</div>
              </div>`,
              { maxWidth: 250 }
            );
          },
        });
      } else if (isDeflock) {
        // DeFlock ALPR crowdsourced locations
        newLayer = L.geoJSON(data, {
          pointToLayer: (_feature, latlng) => {
            return L.circleMarker(latlng, {
              radius: 4,
              fillColor: "#ff6b35",
              color: "#ff6b35",
              fillOpacity: 0.7,
              weight: 1,
              opacity: 0.8,
            });
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            layer.bindPopup(
              `<div style="font-family:monospace;font-size:10px;min-width:200px;">
                <div style="color:#ff6b35;font-weight:bold;font-size:11px;">ALPR CAMERA</div>
                ${props.operator ? `<div style="color:#9aa8b4;margin-top:3px;">Operator: ${props.operator}</div>` : ""}
                ${props.manufacturer ? `<div style="color:#9aa8b4;">Manufacturer: ${props.manufacturer}</div>` : ""}
                ${props.direction ? `<div style="color:#9aa8b4;">Direction: ${props.direction}</div>` : ""}
                <div style="color:#5c6c78;margin-top:4px;font-size:9px;">OSM Node: ${props.osmId || ""}</div>
                <div style="color:#5c6c78;font-size:9px;">Source: DeFlock / OpenStreetMap</div>
              </div>`,
              { maxWidth: 250 }
            );
          },
        });
      } else if (isEffAtlas) {
        // EFF Atlas of Surveillance layers
        newLayer = L.geoJSON(data, {
          pointToLayer: (_feature, latlng) => {
            return L.circleMarker(latlng, {
              radius: 5,
              fillColor: layerConfig.color,
              color: layerConfig.color,
              fillOpacity: 0.8,
              weight: 1.5,
              opacity: 0.9,
            });
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            layer.bindPopup(
              `<div style="font-family:monospace;font-size:10px;min-width:200px;">
                <div style="color:${layerConfig.color};font-weight:bold;font-size:11px;">${props.technology || "SURVEILLANCE"}</div>
                <div style="color:#e0e0e8;margin-top:4px;font-weight:bold;">${props.agency || ""}</div>
                <div style="color:#9aa8b4;margin-top:2px;">${props.city || ""}${props.state ? `, ${props.state}` : ""}</div>
                ${props.vendor ? `<div style="color:#8888a0;margin-top:3px;">Vendor: ${props.vendor}</div>` : ""}
                ${props.summary ? `<div style="color:#8888a0;margin-top:3px;font-size:9px;line-height:1.3;">${props.summary}</div>` : ""}
                <div style="color:#5c6c78;margin-top:4px;font-size:9px;">Source: EFF Atlas of Surveillance</div>
              </div>`,
              { maxWidth: 300 }
            );
          },
        });
      } else {
        // Point layers (hospitals, fire stations, power plants, etc.)
        newLayer = L.geoJSON(data, {
          pointToLayer: (_feature, latlng) => {
            return L.circleMarker(latlng, {
              radius: 4,
              fillColor: layerConfig.color,
              color: layerConfig.color,
              fillOpacity: 0.6,
              weight: 1,
              opacity: 0.8,
            });
          },
          onEachFeature: (feature, layer) => {
            layer.bindPopup(buildFeaturePopup(feature, layerConfig), {
              maxWidth: 280,
            });
          },
        });
      }

      newLayer.addTo(map);
      dynamicLayersRef.current.set(layerConfig.id, newLayer);
      totalPoints += data.features.length;
    });

    const enabledLayers = layers.filter((l) => l.enabled).length;
    setStats({ cameras: cameras.length, layers: enabledLayers, points: totalPoints });
  }, [layers, layerData, cameras.length]);

  // Map style switcher
  const handleStyleChange = (style: string) => {
    if (!mapRef.current) return;
    setMapStyle(style);
    const map = mapRef.current;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const tileConfig = TILE_URLS[style];
    L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: 19,
    }).addTo(map);
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Style switcher */}
      <div className="absolute top-2 right-2 z-[1000] flex gap-px bg-surface border border-border p-px">
        {Object.keys(TILE_URLS).map((style) => (
          <button
            key={style}
            onClick={() => handleStyleChange(style)}
            className={`px-2 py-1 text-[7px] font-heading tracking-[1.5px] uppercase transition-colors ${
              mapStyle === style
                ? "bg-accent-glow text-accent"
                : "text-text-dim hover:text-text"
            }`}
          >
            {style}
          </button>
        ))}
      </div>

      {/* Stat badges */}
      <div className="absolute top-2 left-12 z-[1000] flex gap-1">
        <div className="bg-surface border border-border px-2 py-0.5 text-[8px] font-mono flex items-center gap-1">
          <div className="w-1 h-1 bg-accent" />
          <span className="text-text-dim">CAMERAS</span>
          <span className="text-accent">{stats.cameras.toLocaleString()}</span>
        </div>
        <div className="bg-surface border border-border px-2 py-0.5 text-[8px] font-mono flex items-center gap-1">
          <div className="w-1 h-1 bg-accent" />
          <span className="text-text-dim">LAYERS</span>
          <span className="text-accent">{stats.layers}</span>
        </div>
        <div className="bg-surface border border-border px-2 py-0.5 text-[8px] font-mono flex items-center gap-1">
          <div className="w-1 h-1 bg-warning" />
          <span className="text-text-dim">POINTS</span>
          <span className="text-warning">{stats.points.toLocaleString()}</span>
        </div>
      </div>

      {/* Coords display */}
      <CoordsDisplay map={mapRef.current} />
    </div>
  );
}

function CoordsDisplay({ map }: { map: L.Map | null }) {
  const [coords, setCoords] = useState({ lat: 0, lng: 0, zoom: 5 });

  useEffect(() => {
    if (!map) return;
    const moveHandler = (e: L.LeafletMouseEvent) => {
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng, zoom: map.getZoom() });
    };
    const zoomHandler = () => {
      setCoords((prev) => ({ ...prev, zoom: map.getZoom() }));
    };
    map.on("mousemove", moveHandler);
    map.on("zoomend", zoomHandler);
    return () => {
      map.off("mousemove", moveHandler);
      map.off("zoomend", zoomHandler);
    };
  }, [map]);

  return (
    <div className="absolute bottom-2 left-2 z-[1000] bg-surface border border-border px-2 py-0.5 text-[8px] text-text-dim font-mono flex gap-2">
      <span className="text-accent">{coords.lat.toFixed(5)}</span>
      <span className="text-text-muted">,</span>
      <span className="text-accent">{coords.lng.toFixed(5)}</span>
      <span className="text-text-muted">Z{coords.zoom}</span>
    </div>
  );
}
