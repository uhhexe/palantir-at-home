"use client";

import { Panel, Group, Separator } from "react-resizable-panels";

export function ResizablePanelGroup({
  direction,
  children,
  className,
}: {
  direction: "horizontal" | "vertical";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Group orientation={direction} className={`h-full ${className || ""}`}>
      {children}
    </Group>
  );
}

export function ResizablePanel({
  defaultSize,
  minSize,
  children,
  className,
}: {
  defaultSize: number;
  minSize?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Panel defaultSize={defaultSize} minSize={minSize} className={className}>
      {children}
    </Panel>
  );
}

export function ResizableHandle() {
  return (
    <Separator className="bg-border hover:bg-accent/30 transition-colors data-[orientation=horizontal]:w-[3px] data-[orientation=vertical]:h-[3px]" />
  );
}
