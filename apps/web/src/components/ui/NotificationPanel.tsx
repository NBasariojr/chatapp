// web/src/components/ui/NotificationPanel.tsx

import React, { useState, useEffect, useRef } from "react";
import AppIcon from "components/AppIcon";
import Button from "components/ui/Button";

interface Notification {
  id: string;
  type: "message" | "friend_request" | "system";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  from?: string;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape key + body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Initialize notifications - empty until real API is connected
  useEffect(() => {
    if (isOpen) {
      setNotifications([]);
      setLoading(false);
    }
  }, [isOpen]);

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen]);

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "message":
        return "MessageCircle";
      case "friend_request":
        return "UserPlus";
      case "system":
        return "Bell";
      default:
        return "Bell";
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-title"
        tabIndex={-1}
        className="flex flex-col h-full max-w-2xl mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center space-x-3">
            <AppIcon name="Bell" size={24} className="text-primary" />
            <h2 id="notifications-title" className="text-lg font-semibold text-foreground">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close notifications">
              <AppIcon name="X" size={20} />
            </Button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto p-4 bg-background">
          {loading ? (
            <div className="flex items-center justify-center py-8 space-x-2 text-muted-foreground">
              <AppIcon name="Loader2" size={16} className="animate-spin" />
              <span>Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AppIcon name="Bell" size={48} className="text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No notifications
              </h3>
              <p className="text-muted-foreground text-sm">
                You're all caught up! New notifications will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`w-full p-4 bg-card hover:bg-accent/50 rounded-lg border transition-colors duration-200 cursor-pointer ${
                    !notification.read ? "border-primary/20" : "border-border"
                  }`}
                  onClick={() => markAsRead(notification.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      markAsRead(notification.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AppIcon
                        name={getNotificationIcon(notification.type)}
                        size={16}
                        className={!notification.read ? "text-primary" : "text-muted-foreground"}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`text-sm font-medium truncate ${
                            !notification.read ? "text-foreground" : "text-muted-foreground"
                          }`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          {notification.from && (
                            <p className="text-xs text-muted-foreground mt-1">
                              From {notification.from}
                            </p>
                          )}
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2 ml-2" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatTimestamp(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="p-4 border-t border-border bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Press{" "}
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd>{" "}
              to close
            </span>
            {notifications.length > 0 && (
              <span>{unreadCount} unread</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;
