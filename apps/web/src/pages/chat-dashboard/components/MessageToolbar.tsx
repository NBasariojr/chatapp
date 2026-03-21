// web/src/pages/chat-dashboard/components/MessageToolbar.tsx
import React from "react";
import Icon from "components/AppIcon";
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

interface MessageToolbarProps {
  message: Message;
  isMe: boolean;
  isConfirmingDelete: boolean;
  canEdit: (msg: Message) => boolean;
  canDelete: (msg: Message) => boolean;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDeleteConfirm: (messageId: string) => void;
  onDeleteCancel: () => void;
  onDeleteMessage: (messageId: string) => void;
}

const MessageToolbar = ({
  message,
  isMe,
  isConfirmingDelete,
  canEdit,
  canDelete,
  onReply,
  onEdit,
  onDeleteConfirm,
  onDeleteCancel,
  onDeleteMessage,
}: MessageToolbarProps) => {
  return (
    <div className={`absolute top-0 ${isMe ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"} opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200`}>
      <div className="flex items-center space-x-1 bg-popover border border-border rounded-lg p-1 shadow-lg">
        {isConfirmingDelete ? (
          <>
            <span className="text-xs text-foreground px-1 whitespace-nowrap">Delete?</span>
            <Button
              size="xs"
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteMessage(message.id);
                onDeleteCancel();
              }}
            >Yes</Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onDeleteCancel(); }}
            >No</Button>
          </>
        ) : (
          <>
            <Button
              size="xs"
              variant="ghost"
              title="Reply"
              onClick={(e) => {
                e.stopPropagation();
                onReply(message);
              }}
            >
              <Icon name="MessageCircle" size={14} />
            </Button>
            {canEdit(message) && (
              <Button
                size="xs"
                variant="ghost"
                title="Edit"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(message);
                }}
              >
                <Icon name="Edit2" size={14} />
              </Button>
            )}
            {canDelete(message) && (
              <Button
                size="xs"
                variant="ghost"
                title="Delete"
                className="hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConfirm(message.id);
                }}
              >
                <Icon name="Trash2" size={14} />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MessageToolbar;
