"use client";

import { useCallback, useState } from "react";

interface ScreenshotButtonProps {
  targetSelector?: string;
  filename?: string;
  variant?: "icon" | "full";
}

export default function ScreenshotButton({
  targetSelector = "main",
  filename = "palantir-at-home",
  variant = "icon",
}: ScreenshotButtonProps) {
  const [isCapturing, setIsCapturing] = useState(false);

  const captureScreenshot = useCallback(async () => {
    setIsCapturing(true);
    try {
      const { default: html2canvas } = await import("html2canvas-pro");

      const target =
        (document.querySelector(targetSelector) as HTMLElement) ||
        (document.querySelector("main") as HTMLElement) ||
        document.body;

      const canvas = await html2canvas(target, {
        backgroundColor: "#060809",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        ignoreElements: (el) =>
          el.classList?.contains("no-screenshot") || el.tagName === "IFRAME",
      });

      const ctx = canvas.getContext("2d");
      if (ctx) {
        const h = 40;
        ctx.fillStyle = "rgba(6,8,9,0.9)";
        ctx.fillRect(0, canvas.height - h, canvas.width, h);
        ctx.strokeStyle = "rgba(0,210,170,0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - h);
        ctx.lineTo(canvas.width, canvas.height - h);
        ctx.stroke();

        ctx.font = "600 20px Rajdhani, sans-serif";
        ctx.fillStyle = "#22f5b0";
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        ctx.fillText("palantir at home", 16, canvas.height - h / 2);

        ctx.font = "12px Inconsolata, monospace";
        ctx.fillStyle = "#8b949e";
        ctx.textAlign = "right";
        const ts = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";
        ctx.fillText(ts + "  \u2022  palantir-at-home.vercel.app", canvas.width - 16, canvas.height - h / 2);

        ctx.font = "9px Inconsolata, monospace";
        ctx.fillStyle = "rgba(255,59,92,0.3)";
        ctx.textAlign = "center";
        ctx.fillText("OPEN SOURCE INTELLIGENCE", canvas.width / 2, canvas.height - h / 2);
      }

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}-${new Date().toISOString().split("T")[0]}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, "image/png", 1.0);
    } catch (e) {
      console.error("Screenshot failed:", e);
    } finally {
      setIsCapturing(false);
    }
  }, [targetSelector, filename]);

  if (variant === "icon") {
    return (
      <button
        onClick={captureScreenshot}
        disabled={isCapturing}
        title="Capture screenshot"
        className="flex items-center justify-center w-7 h-7 border border-accent/10 rounded-[3px] transition-all hover:bg-accent-glow hover:text-accent hover:border-accent/20"
        style={{
          background: isCapturing ? "rgba(255,184,48,0.12)" : "transparent",
          color: isCapturing ? "#ffb830" : "#8b949e",
          cursor: isCapturing ? "wait" : "pointer",
          fontSize: "14px",
        }}
      >
        {isCapturing ? "\u25CC" : "\uD83D\uDCF7"}
      </button>
    );
  }

  return (
    <button
      onClick={captureScreenshot}
      disabled={isCapturing}
      className="flex items-center gap-1.5 px-3 py-1.5 border rounded-[3px] font-mono text-[10px] font-semibold tracking-[0.5px] transition-all"
      style={{
        background: isCapturing ? "rgba(255,184,48,0.08)" : "rgba(0,210,170,0.06)",
        borderColor: isCapturing ? "rgba(255,184,48,0.2)" : "rgba(0,210,170,0.12)",
        color: isCapturing ? "#ffb830" : "#8b949e",
        cursor: isCapturing ? "wait" : "pointer",
      }}
    >
      {isCapturing ? "\u25CC CAPTURING..." : "\uD83D\uDCF7 SCREENSHOT"}
    </button>
  );
}
