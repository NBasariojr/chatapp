// web/src/pages/chat-dashboard/components/SystemEventPill.tsx
import React from "react";
import Icon from "components/AppIcon";
import type { SystemEvent } from "../types";

interface SystemEventPillProps {
  event: SystemEvent;
  currentUserId: string;
  isThemed: boolean;
  formatTime: (ts: Date | string) => string;
}

const THEMED_SYSTEM_PILL_STYLE: React.CSSProperties = {
  backgroundColor: "rgba(0, 0, 0, 0.30)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  borderColor: "rgba(255,255,255,0.10)",
};

const SystemEventPill = ({ event, currentUserId, isThemed, formatTime }: SystemEventPillProps) => {
  const actor = event.actorId === currentUserId ? "You" : event.actorName;
  const verb = "changed";
  const pillText = `${actor} ${verb} the theme to "${event.content}"`;

  return (
    <div
      key={event.id}
      className="flex items-center justify-center my-2"
      aria-label="System notification"
    >
      <div
        className="flex items-center space-x-1.5 bg-muted/60 border border-border/40 px-3 py-1 rounded-full max-w-sm"
        style={isThemed ? THEMED_SYSTEM_PILL_STYLE : undefined}
      >
        <Icon
          name="Palette"
          size={11}
          className="flex-shrink-0 text-muted-foreground"
          style={isThemed ? { color: "rgba(255,255,255,0.60)" } : undefined}
        />
        <span
          className="text-xs text-muted-foreground truncate"
          style={isThemed ? { color: "rgba(255,255,255,0.70)" } : undefined}
        >
          {pillText}
        </span>
        <span
          className="text-[10px] text-muted-foreground/60 flex-shrink-0"
          style={isThemed ? { color: "rgba(255,255,255,0.45)" } : undefined}
        >
          {formatTime(event.timestamp)}
        </span>
      </div>
    </div>
  );
};

export default SystemEventPill;
