// web/src/components/ui/SearchOverlay.tsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { ComponentProps } from "react";
import type { AppDispatch } from "redux/store";
import type { User, Room } from "@chatapp/shared";
import { setActiveRoom, fetchRooms, fetchMessages } from "redux/slices/chatSlice";
import { chatService } from "services/chat.service";
import AppIcon from "components/AppIcon";
import Button from "components/ui/Button";
import Input from "components/ui/Input";

// ─── Local UI Types ───────────────────────────────────────────────────────────

type IconName = ComponentProps<typeof AppIcon>["name"];
type ResultType = "user" | "room";

interface SearchResult {
  type: ResultType;
  data: User | Room;
  friendshipStatus?: 'none' | 'friends' | 'request_sent' | 'request_received';
}

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RESULT_ICONS: Record<ResultType, IconName> = {
  user: "User",
  room: "Users",
};

// ─── Component ───────────────────────────────────────────────────────────────

const SearchOverlay = ({ isOpen, onClose }: SearchOverlayProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
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

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setResults([]);
      setSearchError(null);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);

      try {
        const users: any[] = await chatService.searchUsers(searchQuery);
        const userResults: SearchResult[] = users.map((u) => ({
          type: "user",
          data: u,
          friendshipStatus: u.friendshipStatus || 'none',
        }));
        setResults(userResults);
      } catch (err) {
        setSearchError(
          err instanceof Error ? err.message : "Search failed. Try again."
        );
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleSendFriendRequest = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await chatService.sendFriendRequest(userId);
      // Refresh search results to update friendship status
      if (searchQuery.trim()) {
        const users: any[] = await chatService.searchUsers(searchQuery);
        const userResults: SearchResult[] = users.map((u) => ({
          type: "user",
          data: u,
          friendshipStatus: u.friendshipStatus || 'none',
        }));
        setResults(userResults);
      }
    } catch (error) {
      console.error('Failed to send friend request:', error);
    }
  };

  const getFriendButton = (result: SearchResult) => {
    if (result.type !== 'user') return null;

    const status = result.friendshipStatus;
    const data = result.data as User;

    if (status === 'friends') {
      return (
        <span className="text-xs text-success font-medium">Friends</span>
      );
    } else if (status === 'request_sent') {
      return (
        <span className="text-xs text-muted-foreground font-medium">Request Sent</span>
      );
    } else if (status === 'request_received') {
      return (
        <span className="text-xs text-warning font-medium">Request Received</span>
      );
    } else {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => handleSendFriendRequest(data._id, e)}
          className="text-xs"
        >
          Add Friend
        </Button>
      );
    }
  };

  const handleResultClick = useCallback(
    async (result: SearchResult) => {
      if (result.type === "user") {
        const targetUser = result.data as User;
        try {
          // Creates the DM room, or returns existing one (backend handles dedup)
          const room = await chatService.createRoom({
            participantIds: [targetUser._id],
            isGroup: false,
          });

          // Refresh rooms list so the new/existing room appears in the sidebar
          dispatch(fetchRooms());

          // Select the room and load its messages
          dispatch(setActiveRoom(room._id));
          dispatch(fetchMessages({ roomId: room._id }));

          navigate("/chat-dashboard");
        } catch (err) {
          console.error("Failed to open DM:", err);
        }
      } else if (result.type === "room") {
        dispatch(setActiveRoom((result.data as Room)._id));
        dispatch(fetchMessages({ roomId: (result.data as Room)._id }));
        navigate("/chat-dashboard");
      }
      onClose();
    },
    [dispatch, navigate, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex flex-col h-full max-w-2xl mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center space-x-3">
            <AppIcon name="Search" size={24} className="text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Search</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <AppIcon name="X" size={20} />
          </Button>
        </div>

        {/* ── Input ── */}
        <div className="p-4 border-b border-border bg-card">
          <div className="relative">
            <Input
              ref={inputRef}
              type="search"
              placeholder="Search users and conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            <AppIcon
              name="Search"
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          </div>
        </div>

        {/* ── Results ── */}
        <div className="flex-1 overflow-y-auto p-4 bg-background">
          {isSearching ? (
            <div className="flex items-center justify-center py-8 space-x-2 text-muted-foreground">
              <AppIcon name="Loader2" size={16} className="animate-spin" />
              <span>Searching...</span>
            </div>
          ) : searchError ? (
            <div className="flex items-center justify-center py-8 space-x-2 text-destructive">
              <AppIcon name="AlertCircle" size={16} />
              <span className="text-sm">{searchError}</span>
            </div>
          ) : searchQuery && results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AppIcon name="SearchX" size={48} className="text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No results found
              </h3>
              <p className="text-muted-foreground text-sm">
                Try adjusting your search terms or check for typos.
              </p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-4">
                {results.length} result{results.length !== 1 ? "s" : ""} found
              </p>
              {results.map((result) => {
                const isUser = result.type === "user";
                const data = result.data as User;

                return (
                  <div
                    key={data._id}
                    className="w-full p-3 bg-card hover:bg-accent/50 rounded-lg border border-border transition-colors duration-200 cursor-pointer"
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                        <AppIcon
                          name={RESULT_ICONS[result.type]}
                          size={16}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {isUser ? data.username : (result.data as Room).name}
                        </p>
                        {isUser && (
                          <div className="flex items-center justify-between mt-0.5">
                            <div className="flex items-center space-x-2">
                              <div
                                className={`w-2 h-2 rounded-full ${data.isOnline
                                    ? "bg-success"
                                    : "bg-muted-foreground"
                                  }`}
                              />
                              <span className="text-xs text-muted-foreground">
                                {data.isOnline ? "Online" : "Offline"}
                              </span>
                            </div>
                            <div onClick={(e) => e.stopPropagation()}>
                              {getFriendButton(result)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AppIcon name="Search" size={48} className="text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm">
                Search for users and conversations.
              </p>
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
            {results.length > 0 && (
              <span>{results.length} results</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;