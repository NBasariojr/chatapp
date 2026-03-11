import React from "react";
import { cn } from "lib/utils";

type Status = "online" | "away" | "busy" | "offline";

interface PresenceIndicatorProps {
  status: Status;
  size?: "sm" | "default" | "lg";
  className?: string;
}

const statusColors: Record<Status, string> = {
  online:  "bg-success",
  away:    "bg-warning",
  busy:    "bg-error",
  offline: "bg-muted-foreground",
};

const sizeClasses = {
  sm:      "w-2 h-2 border",
  default: "w-3 h-3 border-2",
  lg:      "w-4 h-4 border-2",
};

const PresenceIndicator = ({ status, size = "default", className }: PresenceIndicatorProps) => {
  return (
    <div
      className={cn(
        "rounded-full border-background",
        statusColors[status] || statusColors.offline,
        sizeClasses[size],
        className
      )}
    />
  );
};

export default PresenceIndicator;