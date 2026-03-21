// web/src/pages/chat-dashboard/components/MessageContent.tsx
import React from "react";
import Icon from "components/AppIcon";
import AppImage from "../../../components/AppImage";
import Button from "../../../components/ui/Button";
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

interface MessageContentProps {
  message: Message;
  editingId: string | null;
  editContent: string;
  setEditContent: (content: string) => void;
  onEditMessage: (id: string, content: string) => void;
  setEditingId: (id: string | null) => void;
  isMe: boolean;
  populatedReply: ReplyPreview | null;
  messages: Message[];
  getReplyPreviewText: (replyTo: ReplyPreview | string | null | undefined, messages: Message[]) => string;
}

const MessageContent = ({
  message,
  editingId,
  editContent,
  setEditContent,
  onEditMessage,
  setEditingId,
  isMe,
  populatedReply,
  messages,
  getReplyPreviewText,
}: MessageContentProps) => {
  if (editingId === message.id) {
    return (
      <div className="space-y-2">
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full bg-transparent border-none outline-none resize-none text-sm"
          rows={2}
          autoFocus
        />
        <div className="flex items-center space-x-2">
          <Button size="xs" onClick={() => {
            if (editContent.trim()) onEditMessage(editingId, editContent.trim());
            setEditingId(null);
          }}>Save</Button>
          <Button size="xs" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Quoted reply bubble */}
      {populatedReply && (
        <div className={`mb-2 px-3 py-1.5 rounded-lg border-l-2 border-primary/60 ${
          isMe ? "bg-primary-foreground/10" : "bg-muted/50"
        }`}>
          <div className="flex items-center space-x-1 mb-0.5">
            <Icon name="CornerUpLeft" size={11} className="text-primary/80 flex-shrink-0" />
            <span className={`text-xs font-semibold truncate ${
              isMe ? "text-primary-foreground/80" : "text-primary"
            }`}>
              {typeof populatedReply.sender === "object"
                ? populatedReply.sender.username
                : "Unknown"}
            </span>
          </div>
          <p className={`text-xs truncate ${
            isMe ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}>
            {getReplyPreviewText(populatedReply, messages)}
          </p>
        </div>
      )}

      {/* Message content based on type */}
      {message.type === "text" && (
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
      )}
      {message.type === "image" && (
        <div className="space-y-2">
          <div className="rounded-lg overflow-hidden max-w-xs">
            <AppImage src={message.content} alt="Shared image" className="w-full h-auto" />
          </div>
          {message.caption && <p className="text-sm">{message.caption}</p>}
        </div>
      )}
      {message.type === "file" && (
        <div className="flex items-center space-x-3 p-2 bg-muted/20 rounded-lg">
          <Icon name="File" size={24} />
          <div>
            <p className="text-sm font-medium">{message.fileName}</p>
            <p className="text-xs opacity-70">{message.fileSize}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default MessageContent;
