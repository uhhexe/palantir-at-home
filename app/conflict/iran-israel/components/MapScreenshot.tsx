"use client";

import { useCallback, useState } from "react";

export default function MapScreenshotButton() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [copied, setCopied] = useState(false);

  const addWatermark = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const barH = 48;

    // Bottom bar
    ctx.fillStyle = "rgba(6,8,9,0.85)";
    ctx.fillRect(0, canvas.height - barH, canvas.width, barH);
    ctx.strokeStyle = "rgba(0,210,170,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - barH);
    ctx.lineTo(canvas.width, canvas.height - barH);
    ctx.stroke();

    // Logo
    ctx.font = "700 24px Rajdhani, sans-serif";
    ctx.fillStyle = "#22f5b0";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText("palantir at home", 20, canvas.height - barH / 2);

    // Timestamp
    ctx.font = "13px Inconsolata, monospace";
    ctx.fillStyle = "#8b949e";
    ctx.textAlign = "right";
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toISOString().split("T")[1].substring(0, 8);
    ctx.fillText(`${dateStr} ${timeStr} UTC`, canvas.width - 20, canvas.height - barH / 2 - 8);

    ctx.font = "11px Inconsolata, monospace";
    ctx.fillStyle = "#7d8590";
    ctx.fillText("palantir-at-home.vercel.app", canvas.width - 20, canvas.height - barH / 2 + 10);

    // Top-left classification
    ctx.fillStyle = "rgba(6,8,9,0.75)";
    ctx.fillRect(0, 0, 220, 28);
    ctx.font = "10px Inconsolata, monospace";
    ctx.fillStyle = "rgba(255,59,92,0.5)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("OPEN SOURCE INTELLIGENCE", 10, 8);
  };

  const captureMap = useCallback(async () => {
    setIsCapturing(true);
    try {
      const { default: html2canvas } = await import("html2canvas-pro");

      const mapEl = document.querySelector(".leaflet-container") as HTMLElement;
      if (!mapEl) {
        console.error("Map container not found");
        setIsCapturing(false);
        return;
      }

      const canvas = await html2canvas(mapEl, {
        backgroundColor: "#060809",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      addWatermark(canvas);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `palantir-at-home-map-${new Date().toISOString().split("T")[0]}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, "image/png", 1.0);
    } catch (e) {
      console.error("Map screenshot failed:", e);
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const copyToClipboard = useCallback(async () => {
    setIsCapturing(true);
    try {
      const { default: html2canvas } = await import("html2canvas-pro");

      const mapEl = document.querySelector(".leaflet-container") as HTMLElement;
      if (!mapEl) {
        setIsCapturing(false);
        return;
      }

      const canvas = await html2canvas(mapEl, {
        backgroundColor: "#060809",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      addWatermark(canvas);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Fallback to download
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "palantir-at-home-map.png";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, "image/png");
    } catch (e) {
      console.error("Copy failed:", e);
    } finally {
      setIsCapturing(false);
    }
  }, []);

  return (
    <div
      className="absolute top-2.5 right-2.5 z-[1000] flex items-center gap-1 no-screenshot"
      style={{ backdropFilter: "blur(4px)" }}
    >
      <button
        onClick={captureMap}
        disabled={isCapturing}
        title="Save map as image"
        className="flex items-center gap-1 px-2.5 py-1 rounded-[3px] font-mono text-[9px] font-semibold tracking-[0.5px] transition-all hover:border-accent/30 hover:text-accent"
        style={{
          background: "rgba(6,8,9,0.8)",
          border: "1px solid rgba(0,210,170,0.15)",
          color: isCapturing ? "#ffb830" : "#8b949e",
          cursor: isCapturing ? "wait" : "pointer",
        }}
      >
        {isCapturing ? "\u25CC..." : "\uD83D\uDCF7 SAVE"}
      </button>
      <button
        onClick={copyToClipboard}
        disabled={isCapturing}
        title="Copy map to clipboard"
        className="flex items-center gap-1 px-2.5 py-1 rounded-[3px] font-mono text-[9px] font-semibold tracking-[0.5px] transition-all hover:border-accent/30 hover:text-accent"
        style={{
          background: "rgba(6,8,9,0.8)",
          border: "1px solid rgba(0,210,170,0.15)",
          color: copied ? "#22f5b0" : "#8b949e",
          cursor: isCapturing ? "wait" : "pointer",
        }}
      >
        {copied ? "\u2713 COPIED" : "\uD83D\uDCCB COPY"}
      </button>
    </div>
  );
}
