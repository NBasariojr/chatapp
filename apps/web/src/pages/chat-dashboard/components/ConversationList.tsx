import React, { useState, useMemo } from "react";
import Icon from "components/AppIcon";
import AppImage from "../../../components/AppImage";
import Input from "components/ui/Input";
import ProfileView from "./ProfileView";

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
  sender: { id: string; name: string };
  timestamp: Date | string;
  type: string;
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
  onConversationSelect: (conversation: Conversation) => void;
  currentUser: Participant;
}

const formatTimestamp = (timestamp: Date | string) => {
  const now = new Date();
  const messageTime = new Date(timestamp);
  const diffInHours = (now.getTime() - messageTime.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    const mins = Math.floor(diffInHours * 60);
    return mins < 1 ? "now" : `${mins}m`;
  }
  if (diffInHours < 24) return `${Math.floor(diffInHours)}h`;
  return messageTime.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const ConversationList = ({
  conversations,
  activeConversation,
  onConversationSelect,
  currentUser,
}: ConversationListProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.lastMessage?.content?.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const getPreview = (conversation: Conversation) => {
    if (!conversation.lastMessage) return "No messages yet";
    const { content, sender, type } = conversation.lastMessage;
    const isMe = sender?.id === currentUser?.id;
    const name = isMe
      ? "You"
      : sender?.name?.split(" ")[0] ?? "Someone";
    if (type === "image") return `${name}: 📷 Photo`;
    if (type === "file") return `${name}: 📎 File`;
    return `${name}: ${content?.length > 50 ? content.substring(0, 50) + "..." : content ?? ""}`;
  };
  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Messages</h2>
          <button className="p-2 hover:bg-accent/50 rounded-lg transition-colors duration-200">
            <Icon name="Plus" size={20} />
          </button>
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

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Icon name="MessageCircle" size={48} className="text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchQuery ? "No conversations found" : "No conversations yet"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Try adjusting your search terms" : "Start a new conversation to get chatting"}
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filtered.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onConversationSelect(conversation)}
                className={`w-full p-3 rounded-lg text-left transition-all duration-200 hover:bg-accent/50 ${activeConversation?.id === conversation.id
                  ? "bg-accent border border-primary/20"
                  : "hover:bg-accent/30"
                  }`}
              >
                <div className="flex items-start space-x-3">
                  {conversation.type === "direct" ? (() => {
                    const otherPerson = conversation.participants.find(
                      (p) => p.id !== currentUser?.id
                    );

                    const displayUser = otherPerson ?? conversation.participants[0];

                    if (!displayUser) return null;

                    return (
                      <ProfileView
                        user={{ ...displayUser, name: conversation.name, avatar: conversation.avatar }}
                        showFullName={false}
                        showStatus={true}
                        showLastSeen={false}
                        size="default"
                        currentUser={currentUser}
                        className="flex-shrink-0"
                      />
                    );
                  })() : (
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary">
                        {conversation.avatar ? (
                          <AppImage src={conversation.avatar} alt={conversation.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon name={conversation.type === "group" ? "Users" : "User"} size={20} className="text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-medium text-foreground truncate">{conversation.name}</h3>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {conversation.lastMessage && (
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(conversation.lastMessage.timestamp)}
                          </span>
                        )}
                        {conversation.unreadCount > 0 && (
                          <div className="bg-error text-error-foreground text-xs font-medium px-2 py-0.5 rounded-full min-w-[20px] text-center">
                            {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{getPreview(conversation)}</p>

                    {conversation.type === "group" && (
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center">
                          <Icon name="Users" size={12} className="text-muted-foreground mr-1" />
                          <span className="text-xs text-muted-foreground">
                            {conversation.participants.length} members
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;