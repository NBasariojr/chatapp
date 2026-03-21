// web/src/pages/chat-dashboard/components/MessageThread.tsx
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import Icon from "components/AppIcon";
import AppImage from "../../../components/AppImage";
import Button from "../../../components/ui/Button";
import ProfileView from "./ProfileView";
import MessageInput from "./MessageInput";
import SystemEventPill from "./SystemEventPill";
import MessageBubble from "./MessageBubble";
import { setActiveRoom } from "../../../redux/slices/chatSlice";
import type { ReplyPreview } from "@chatapp/shared";
import type { Theme } from "./ThemeModal";
import type { SystemEvent } from "../types";

interface Sender {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
}

interface Message {
  id: string;
  content: string;
  type: "text" | "image" | "file";
  sender: Sender;
  timestamp: Date | string;
  status?: "sent" | "delivered" | "read";
  caption?: string;
  fileName?: string;
  fileSize?: string;
  edited?: boolean;
  replyTo?: ReplyPreview | string | null;
}

interface Conversation {
  id: string;
  type: "direct" | "group";
  name: string;
  avatar?: string;
  participants: Sender[];
}

interface MessageData {
  type: "text" | "image" | "file";
  content: string;
  fileName?: string;
  fileSize?: string;
  replyTo?: string;
}

interface ReplyContext {
  messageId: string;
  content: string;
  type: string;
  senderName: string;
}

interface MessageThreadProps {
  conversation: Conversation | null;
  messages: Message[];
  currentUser: Sender;
  onSendMessage: (data: MessageData) => void;
  onEditMessage: (id: string, content: string) => void;
  onDeleteMessage: (id: string) => void;
  onTyping?: (typing: boolean) => void;
  showDetails?: boolean;
  onToggleDetails?: () => void;
  theme?: Theme;
  systemEvents?: SystemEvent[];
}

// ─── Timeline item ────────────────────────────────────────────────────────────
type TimelineItem =
  | { kind: "message"; data: Message }
  | { kind: "system";  data: SystemEvent };

// ─── Themed overlay styles ────────────────────────────────────────────────────
const THEMED_DATE_PILL_STYLE: React.CSSProperties = {
  backgroundColor: "rgba(0, 0, 0, 0.35)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
};

const THEMED_RECEIVED_BUBBLE_STYLE: React.CSSProperties = {
  backgroundColor: "hsla(0, 0%, 100%, 0.82)",
  color: "#1e1b2e",
  borderColor: "transparent",
};

const THEMED_SYSTEM_PILL_STYLE: React.CSSProperties = {
  backgroundColor: "rgba(0, 0, 0, 0.30)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  borderColor: "rgba(255,255,255,0.10)",
};
// ─────────────────────────────────────────────────────────────────────────────

const formatTime = (ts: Date | string) =>
  new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

const formatDate = (ts: Date | string) => {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
};

const getReplyPreviewText = (
  replyTo: ReplyPreview | string | null | undefined,
  messages: Message[],
): string => {
  if (!replyTo) return "Original message";
  
  if (typeof replyTo === "string") {
    const repliedMessage = messages.find(msg => msg.id === replyTo);
    if (!repliedMessage) return "Original message";
    
    if (repliedMessage.type === "image") return "📷 Photo";
    if (repliedMessage.type === "file") return "📎 File";
    return repliedMessage.content.length > 50 
      ? repliedMessage.content.slice(0, 50) + "..." 
      : repliedMessage.content;
  }
  
  if (replyTo.type === "image") return "📷 Photo";
  if (replyTo.type === "file") return "📎 File";
  return replyTo.content.length > 50 
    ? replyTo.content.slice(0, 50) + "..." 
    : replyTo.content;
};

const MessageThread = ({
  conversation,
  messages,
  currentUser,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onTyping,
  showDetails,
  onToggleDetails,
  theme,
  systemEvents = [],
}: MessageThreadProps) => {
  const [editingId, setEditingId]             = useState<string | null>(null);
  const [editContent, setEditContent]         = useState("");
  const [replyingTo, setReplyingTo]           = useState<ReplyContext | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isMobile, setIsMobile]               = useState(window.innerWidth < 768);
  const bottomRef = useRef<HTMLDivElement>(null);
  const dispatch  = useDispatch();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, systemEvents]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setReplyingTo(null);
    setConfirmDeleteId(null);
  }, [conversation?.id]);

  // ── Merged chronological timeline ─────────────────────────────────────────
  const timeline = useMemo<Record<string, TimelineItem[]>>(() => {
    const all: TimelineItem[] = [
      ...messages.map((m): TimelineItem => ({ kind: "message", data: m })),
      ...systemEvents.map((e): TimelineItem => ({ kind: "system", data: e })),
    ];
    all.sort(
      (a, b) =>
        new Date(a.data.timestamp).getTime() -
        new Date(b.data.timestamp).getTime(),
    );
    return all.reduce<Record<string, TimelineItem[]>>((acc, item) => {
      const key = new Date(item.data.timestamp).toDateString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [messages, systemEvents]);
  // ─────────────────────────────────────────────────────────────────────────

  const canEdit = (msg: Message) => {
    const mins = (Date.now() - new Date(msg.timestamp).getTime()) / 60000;
    return msg.sender.id === currentUser.id && mins <= 15 && msg.type === 'text';
  };

  const canDelete = (msg: Message) => {
    const hours = (Date.now() - new Date(msg.timestamp).getTime()) / 3600000;
    return msg.sender.id === currentUser.id && hours <= 24;
  };

  const handleSendMessage = (data: MessageData) => {
    onSendMessage({
      ...data,
      ...(replyingTo && { replyTo: replyingTo.messageId }),
    });
    setReplyingTo(null);
  };

  const threadBg       = theme?.background     || undefined;
  const sentBubbleBg   = theme?.sentMessageBg  || undefined;
  const sentBubbleText = theme?.sentMessageText || undefined;
  const isThemed       = Boolean(threadBg);

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <Icon name="MessageCircle" size={64} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-medium text-foreground mb-2">Welcome to LinkUp</h3>
          <p className="text-muted-foreground">Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  const headerUser =
    conversation.type === "direct"
      ? (conversation.participants.find((p) => p.id !== currentUser.id) ??
          conversation.participants[0] ??
          { id: "", name: conversation.name, avatar: conversation.avatar })
      : null;

  return (
    <div className="h-full flex flex-col bg-background">

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center space-x-3">
          {isMobile && (
            <button
              onClick={() => dispatch(setActiveRoom(null))}
              className="p-2 -ml-2 hover:bg-accent/50 rounded-lg transition-colors"
            >
              <Icon name="ArrowLeft" size={20} />
            </button>
          )}
          {conversation.type === "direct" && headerUser ? (
            <ProfileView
              user={{ ...headerUser, name: conversation.name, avatar: conversation.avatar }}
              showFullName={true}
              showStatus={true}
              showLastSeen={true}
              size="lg"
              currentUser={currentUser}
            />
          ) : (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary flex items-center justify-center">
                {conversation.avatar ? (
                  <AppImage src={conversation.avatar} alt={conversation.name} className="w-full h-full object-cover" />
                ) : (
                  <Icon name="Users" size={20} className="text-muted-foreground" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{conversation.name}</h2>
                <p className="text-sm text-muted-foreground">{conversation.participants.length} members</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon"><Icon name="Phone" size={20} /></Button>
          <Button variant="ghost" size="icon"><Icon name="Video" size={20} /></Button>
          <Button variant="ghost" size="icon" onClick={onToggleDetails}><Icon name="MoreVertical" size={20} /></Button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 transition-all duration-300"
        style={threadBg ? { background: threadBg } : undefined}
      >
        {Object.entries(timeline).map(([dateKey, dayItems]) => (
          <div key={dateKey}>

            {/* Date separator */}
            <div className="flex items-center justify-center my-6">
              <div
                className="px-3 py-1 rounded-full bg-muted"
                style={isThemed ? THEMED_DATE_PILL_STYLE : undefined}
              >
                <span
                  className="text-xs font-medium text-muted-foreground"
                  style={isThemed ? { color: "rgba(255,255,255,0.80)" } : undefined}
                >
                  {formatDate(dayItems[0].data.timestamp)}
                </span>
              </div>
            </div>

            {dayItems.map((item, index) => {
              if (item.kind === "system") {
                return (
                  <SystemEventPill
                    key={item.data.id}
                    event={item.data}
                    currentUserId={currentUser.id}
                    isThemed={isThemed}
                    formatTime={formatTime}
                  />
                );
              }

              // Regular message
              const message = item.data;
              const isMe = message.sender.id === currentUser.id;

              const prevMessageItem = dayItems
                .slice(0, index)
                .reverse()
                .find((i) => i.kind === "message");
              const prevSenderId =
                prevMessageItem?.kind === "message"
                  ? prevMessageItem.data.sender.id
                  : null;

              const showAvatar = !isMe && prevSenderId !== message.sender.id;
              const populatedReply =
                message.replyTo && typeof message.replyTo === "object"
                  ? message.replyTo
                  : null;

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  currentUser={currentUser}
                  isMe={isMe}
                  showAvatar={showAvatar}
                  populatedReply={populatedReply}
                  editingId={editingId}
                  editContent={editContent}
                  confirmDeleteId={confirmDeleteId}
                  messages={messages}
                  sentBubbleBg={sentBubbleBg}
                  sentBubbleText={sentBubbleText}
                  isThemed={isThemed}
                  formatTime={formatTime}
                  onEditMessage={onEditMessage}
                  onDeleteMessage={onDeleteMessage}
                  setEditingId={setEditingId}
                  setEditContent={setEditContent}
                  setConfirmDeleteId={setConfirmDeleteId}
                  setReplyingTo={setReplyingTo}
                  getReplyPreviewText={getReplyPreviewText}
                  canEdit={canEdit}
                  canDelete={canDelete}
                />
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="flex-shrink-0">
        <MessageInput
          onSendMessage={handleSendMessage}
          onTyping={onTyping}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          theme={theme}
        />
      </div>
    </div>
  );
};

export default MessageThread;