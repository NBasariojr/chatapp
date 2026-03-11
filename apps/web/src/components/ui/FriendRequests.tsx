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

  useEffect(() => {
    if (!isOpen) onRequestHandled?.();
  }, [isOpen, onRequestHandled]);

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
    // Backdrop — clicking outside closes the panel
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel — stops click from closing when clicking inside */}
      <div
        className="relative flex flex-col w-full max-w-sm mx-4 mt-20 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxHeight: "calc(100vh - 120px)" }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
          <div className="flex items-center space-x-3">
            {/* Teal icon badge — matches primary color */}
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <AppIcon name="UserPlus" size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground leading-tight">
                Friend Requests
              </h2>
              {/* Live count badge */}
              {requests.length > 0 && !loading && (
                <p className="text-xs text-muted-foreground">
                  {requests.length} pending
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground"
          >
            <AppIcon name="X" size={16} />
          </button>
        </div>

        {/* ── Content ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">Loading requests...</p>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <AppIcon name="AlertCircle" size={22} className="text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Something went wrong</p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
              <Button size="sm" variant="outline" onClick={fetchRequests}>
                <AppIcon name="RefreshCw" size={14} className="mr-2" />
                Try again
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && requests.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-1">
                <AppIcon name="Users" size={26} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No pending requests</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When someone sends you a friend request, it will appear here.
              </p>
            </div>
          )}

          {/* Request list */}
          {!loading && !error && requests.length > 0 && (
            <div className="p-3 space-y-2">
              {requests.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background hover:bg-accent/20 transition-colors duration-150"
                >
                  {/* Avatar with initials fallback */}
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {getInitials(user.username)}
                      </span>
                    </div>
                    {/* Online indicator dot */}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                        user.isOnline ? "bg-green-500" : "bg-muted-foreground"
                      }`}
                    />
                  </div>

                  {/* Name + status */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.isOnline ? "Online now" : "Offline"}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Reject — ghost/outline */}
                    <button
                      onClick={() => handleReject(user._id)}
                      disabled={rejecting === user._id || accepting === user._id}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive text-muted-foreground transition-colors disabled:opacity-40"
                      title="Reject"
                    >
                      {rejecting === user._id
                        ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                        : <AppIcon name="X" size={14} />
                      }
                    </button>

                    {/* Accept — primary filled */}
                    <button
                      onClick={() => handleAccept(user._id)}
                      disabled={accepting === user._id || rejecting === user._id}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors disabled:opacity-40"
                      title="Accept"
                    >
                      {accepting === user._id
                        ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                        : <AppIcon name="Check" size={14} />
                      }
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        {!loading && !error && requests.length > 0 && (
          <div className="px-5 py-3 border-t border-border bg-card">
            <p className="text-xs text-muted-foreground text-center">
              Accepting a request lets you chat with this person
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendRequests;