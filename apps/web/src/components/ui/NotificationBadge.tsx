// web/src/components/ui/NotificationBadge.tsx

import React from "react";

type BadgeVariant = "default" | "primary" | "success" | "warning";

interface NotificationBadgeProps {
  count?: number;
  className?: string;
  variant?: BadgeVariant;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-error text-error-foreground",
  primary: "bg-primary text-primary-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
};

const NotificationBadge = ({
  count = 0,
  className = "",
  variant = "default",
}: NotificationBadgeProps) => {
  if (count <= 0) return null;

  return (
    <div
      className={`
        inline-flex items-center justify-center
        min-w-[20px] h-5 px-1.5
        text-xs font-medium rounded-full
        ${VARIANT_CLASSES[variant]}
        ${className}
      `}
    >
      {count > 99 ? "99+" : count}
    </div>
  );
};

export default NotificationBadge;