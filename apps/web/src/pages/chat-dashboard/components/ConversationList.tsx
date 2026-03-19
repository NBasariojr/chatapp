import React, { useState } from "react";
import Icon from "../../../components/AppIcon";
import AppImage from "../../../components/AppImage";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import PresenceIndicator from "../../../components/ui/PresenceIndicator"; // ← added

// ─── Types ───────────────────────────────────────────────────────────────────

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  status?: "online" | "away" | "busy" | "offline";
  role?: string;
}

interface LastMessage {
  id: string;
  content: string;
  type: string;
  timestamp: string;
  sender: { id: string; name: string };
}

interface Conversation {
  id: string;
  type: "direct" | "group";
  name: string;
  avatar?: string;
  participants: Participant[];
  lastMessage?: LastMessage;
  unreadCount: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  onConversationSelect: (conversation: { id: string }) => void;
  currentUser: Participant;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatTimestamp = (ts: string): string => {
  const date = new Date(ts);
  if (isNaN(date.getTime())) return "";

  const now    = new Date();
  const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor(
    (today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0)
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)
    return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getLastMessagePreview = (
  msg: LastMessage | undefined,
  currentUserId: string,
): string => {
  if (!msg) return "No messages yet";
  const prefix = msg.sender.id === currentUserId ? "You: " : "";
  if (msg.type === "image") return `${prefix}📷 Photo`;
  if (msg.type === "file")  return `${prefix}📎 File`;
  const text = msg.content ?? "";
  return `${prefix}${text.length > 40 ? text.slice(0, 40) + "…" : text}`;
};

// ─── Avatar sub-component ─────────────────────────────────────────────────────

interface ConversationAvatarProps {
  conversation: Conversation;
  currentUserId: string;
}

const ConversationAvatar = ({
  conversation,
  currentUserId,
}: ConversationAvatarProps) => {
  const otherParticipant =
    conversation.type === "direct"
      ? (conversation.participants.find((p) => p.id !== currentUserId) ??
          conversation.participants[0])
      : null;

  return (
    <div className="relative flex-shrink-0">
      <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary flex items-center justify-center">
        {conversation.avatar ? (
          <AppImage
            src={conversation.avatar}
            alt={conversation.name}
            className="w-full h-full object-cover"
          />
        ) : conversation.type === "group" ? (
          <Icon name="Users" size={20} className="text-muted-foreground" />
        ) : (
          <Icon name="User" size={20} className="text-muted-foreground" />
        )}
      </div>

      {/* ── Presence indicator — direct chats only, all statuses ── */}
      {conversation.type === "direct" && otherParticipant?.status && (
        <PresenceIndicator
          status={otherParticipant.status}
          size="default"
          className="absolute bottom-0 right-0"
        />
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ConversationList = ({
  conversations,
  activeConversation,
  onConversationSelect,
  currentUser,
}: ConversationListProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* ── Header ── */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Messages</h2>
          <Button variant="ghost" size="icon" title="New conversation">
            <Icon name="SquarePen" size={20} />
          </Button>
        </div>

        <div className="relative">
          <Input
            type="search"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <Icon
            name="Search"
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
        </div>
      </div>

      {/* ── List ── */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <Icon
              name="MessageCircleDashed"
              size={40}
              className="text-muted-foreground mb-3"
            />
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? "No conversations match your search"
                : "No conversations yet"}
            </p>
          </div>
        ) : (
          <ul role="list" className="py-1">
            {filtered.map((conversation) => {
              const isActive  = activeConversation?.id === conversation.id;
              const preview   = getLastMessagePreview(
                conversation.lastMessage,
                currentUser.id,
              );
              const timestamp = conversation.lastMessage?.timestamp
                ? formatTimestamp(conversation.lastMessage.timestamp)
                : "";

              return (
                <li key={conversation.id} role="listitem">
                  <button
                    onClick={() =>
                      onConversationSelect({ id: conversation.id })
                    }
                    className={[
                      "w-full flex items-center space-x-3 px-4 py-3 text-left",
                      "transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      isActive ? "bg-accent" : "hover:bg-accent/50",
                    ].join(" ")}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <ConversationAvatar
                      conversation={conversation}
                      currentUserId={currentUser.id}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span
                          className={[
                            "text-sm truncate",
                            conversation.unreadCount > 0
                              ? "font-semibold text-foreground"
                              : "font-medium text-foreground",
                          ].join(" ")}
                        >
                          {conversation.name}
                        </span>
                        {timestamp && (
                          <span
                            className={[
                              "text-xs flex-shrink-0 ml-2",
                              conversation.unreadCount > 0
                                ? "text-primary font-medium"
                                : "text-muted-foreground",
                            ].join(" ")}
                          >
                            {timestamp}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <p
                          className={[
                            "text-xs truncate",
                            conversation.unreadCount > 0
                              ? "text-foreground"
                              : "text-muted-foreground",
                          ].join(" ")}
                        >
                          {preview}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <span
                            className="ml-2 flex-shrink-0 min-w-[1.25rem] h-5 px-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center"
                            aria-label={`${conversation.unreadCount} unread messages`}
                          >
                            {conversation.unreadCount > 99
                              ? "99+"
                              : conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ConversationList;