// web/src/pages/chat-dashboard/components/MessageBubble.tsx
import React from "react";
import Icon from "components/AppIcon";
import ProfileView from "./ProfileView";
import MessageContent from "./MessageContent";
import MessageToolbar from "./MessageToolbar";
import type { ReplyPreview } from "@chatapp/shared";

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

interface MessageBubbleProps {
  message: Message;
  currentUser: Sender;
  isMe: boolean;
  showAvatar: boolean;
  populatedReply: ReplyPreview | null;
  editingId: string | null;
  editContent: string;
  confirmDeleteId: string | null;
  messages: Message[];
  sentBubbleBg?: string;
  sentBubbleText?: string;
  isThemed: boolean;
  formatTime: (ts: Date | string) => string;
  onEditMessage: (id: string, content: string) => void;
  onDeleteMessage: (id: string) => void;
  setEditingId: (id: string | null) => void;
  setEditContent: (content: string) => void;
  setConfirmDeleteId: (id: string | null) => void;
  setReplyingTo: (reply: { messageId: string; content: string; type: string; senderName: string }) => void;
  getReplyPreviewText: (replyTo: ReplyPreview | string | null | undefined, messages: Message[]) => string;
  canEdit: (msg: Message) => boolean;
  canDelete: (msg: Message) => boolean;
}

const THEMED_RECEIVED_BUBBLE_STYLE: React.CSSProperties = {
  backgroundColor: "hsla(0, 0%, 100%, 0.82)",
  color: "#1e1b2e",
  borderColor: "transparent",
};

const MessageBubble = ({
  message,
  currentUser,
  isMe,
  showAvatar,
  populatedReply,
  editingId,
  editContent,
  confirmDeleteId,
  messages,
  sentBubbleBg,
  sentBubbleText,
  isThemed,
  formatTime,
  onEditMessage,
  onDeleteMessage,
  setEditingId,
  setEditContent,
  setConfirmDeleteId,
  setReplyingTo,
  getReplyPreviewText,
  canEdit,
  canDelete,
}: MessageBubbleProps) => {
  const isConfirmingDelete = confirmDeleteId === message.id;

  const bubbleStyle = React.useMemo(() => {
    if (isMe && sentBubbleBg) {
      return { backgroundColor: sentBubbleBg, color: sentBubbleText };
    }
    if (!isMe && isThemed) {
      return THEMED_RECEIVED_BUBBLE_STYLE;
    }
    return undefined;
  }, [isMe, sentBubbleBg, sentBubbleText, isThemed]);

  const handleReply = (msg: Message) => {
    setReplyingTo({
      messageId: msg.id,
      content: msg.content,
      type: msg.type,
      senderName: isMe ? "yourself" : msg.sender.name,
    });
  };

  const handleEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  return (
    <button
      className={`flex ${isMe ? "justify-end" : "justify-start"} group`}
      onClick={() => { if (isConfirmingDelete) setConfirmDeleteId(null); }}
      aria-label={isConfirmingDelete ? "Cancel delete confirmation" : "Message bubble"}
    >
      <div className={`flex max-w-[70%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
        {showAvatar && !isMe && (
          <div className="flex-shrink-0 mr-2">
            <ProfileView
              user={message.sender}
              showFullName={false}
              showName={false}
              showStatus={false}
              size="sm"
              currentUser={currentUser}
            />
          </div>
        )}
        {!showAvatar && !isMe && <div className="w-8 mr-2" />}

        <div className={`relative ${isMe ? "mr-2" : ""}`}>
          <div
            className={`px-4 py-2 rounded-2xl ${
              isMe
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-card-foreground"
            }`}
            style={bubbleStyle}
          >
            <MessageContent
              message={message}
              editingId={editingId}
              editContent={editContent}
              setEditContent={setEditContent}
              onEditMessage={onEditMessage}
              setEditingId={setEditingId}
              isMe={isMe}
              populatedReply={populatedReply}
              messages={messages}
              getReplyPreviewText={getReplyPreviewText}
            />
          </div>

          <MessageToolbar
            message={message}
            isMe={isMe}
            isConfirmingDelete={isConfirmingDelete}
            canEdit={canEdit}
            canDelete={canDelete}
            onReply={handleReply}
            onEdit={handleEdit}
            onDeleteConfirm={setConfirmDeleteId}
            onDeleteCancel={() => setConfirmDeleteId(null)}
            onDeleteMessage={onDeleteMessage}
          />

          <div className={`flex items-center space-x-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
            <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
            {isMe && (
              <Icon
                name={message.status === "read" ? "CheckCheck" : "Check"}
                size={12}
                className={message.status === "read" ? "text-primary" : "text-muted-foreground"}
              />
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

export default MessageBubble;
