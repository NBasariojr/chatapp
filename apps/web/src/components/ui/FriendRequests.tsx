// web/src/components/ui/FriendRequests.tsx
import React, { useState, useEffect } from "react";
import { chatService } from "services/chat.service";
import type { User } from "@chatapp/shared";
import AppIcon from "components/AppIcon";
import Button from "components/ui/Button";

interface FriendRequestsProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestHandled?: () => void;
}

// Generates a consistent teal/muted color avatar from username initials
const getInitials = (username: string) =>
  username?.slice(0, 2).toUpperCase() ?? "??";

const FriendRequests = ({ isOpen, onClose, onRequestHandled }: FriendRequestsProps) => {
  const [requests, setRequests]   = useState<User[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) fetchRequests();
  }, [isOpen]);

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

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await chatService.getFriendRequests();
      setRequests(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (userId: string) => {
    setAccepting(userId);
    try {
      await chatService.acceptFriendRequest(userId);
      await fetchRequests();
      onRequestHandled?.();
    } catch (e) {
      console.error("Failed to accept:", e);
    } finally {
      setAccepting(null);
    }
  };

  const handleReject = async (userId: string) => {
    setRejecting(userId);
    try {
      await chatService.rejectFriendRequest(userId);
      await fetchRequests();
      onRequestHandled?.();
    } catch (e) {
      console.error("Failed to reject:", e);
    } finally {
      setRejecting(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex flex-col h-full w-full max-w-2xl mx-auto"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center space-x-3">
            <AppIcon name="UserPlus" size={24} className="text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Friend Requests</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <AppIcon name="X" size={20} />
          </Button>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto p-4 bg-background">

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-8 space-x-2 text-muted-foreground">
              <AppIcon name="Loader2" size={16} className="animate-spin" />
              <span>Loading requests...</span>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="flex items-center justify-center py-8 space-x-2 text-destructive">
              <AppIcon name="AlertCircle" size={16} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && requests.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AppIcon name="Users" size={48} className="text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No pending requests
              </h3>
              <p className="text-muted-foreground text-sm">
                When someone sends you a friend request, it will appear here.
              </p>
            </div>
          )}

          {/* Request list */}
          {!loading && !error && requests.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-4">
                {requests.length} pending request{requests.length === 1 ? "" : "s"}
              </p>
              {requests.map((user) => (
                <div
                  key={user._id}
                  className="w-full p-3 bg-card hover:bg-accent/50 rounded-lg border border-border transition-colors duration-200 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Avatar with initials fallback */}
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                        <AppIcon name="User" size={16} />
                      </div>
                      {/* Online indicator dot */}
                      <div
                        className={`w-2 h-2 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-card ${
                          user.isOnline ? "bg-success" : "bg-muted-foreground"
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.username}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Delete button */}
                        <button
                          onClick={() => handleReject(user._id)}
                          disabled={rejecting === user._id || accepting === user._id}
                          className="h-8 px-3 flex items-center justify-center rounded-lg border border-border hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive text-muted-foreground text-xs font-medium transition-colors disabled:opacity-40"
                          title="Delete"
                        >
                          {rejecting === user._id
                            ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                            : "Delete"
                          }
                        </button>

                        {/* Confirm button */}
                        <button
                          onClick={() => handleAccept(user._id)}
                          disabled={accepting === user._id || rejecting === user._id}
                          className="h-8 px-3 flex items-center justify-center rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors disabled:opacity-40"
                          title="Confirm"
                        >
                          {accepting === user._id
                            ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                            : "Confirm"
                          }
                        </button>
                      </div>
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
            {requests.length > 0 && (
              <span>{requests.length} request{requests.length === 1 ? "" : "s"}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FriendRequests;