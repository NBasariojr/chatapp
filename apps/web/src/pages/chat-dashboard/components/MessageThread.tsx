// web/src/pages/chat-dashboard/components/MessageThread.tsx
import React, { useState, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import Icon from "components/AppIcon";
import AppImage from "../../../components/AppImage";
import Button from "../../../components/ui/Button";
import ProfileView from "./ProfileView";
import MessageInput from "./MessageInput";
import { setActiveRoom } from "../../../redux/slices/chatSlice";
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
}

const formatTime = (ts: Date | string) =>
  new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

const formatDate = (ts: Date | string) => {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
};

const getReplyPreviewText = (replyTo: ReplyPreview | string | null | undefined): string => {
  if (!replyTo || typeof replyTo === "string") return "Original message";
  if (replyTo.type === "image") return "📷 Photo";
  if (replyTo.type === "file")  return "📎 File";
  const text = replyTo.content ?? "";
  return text.length > 60 ? text.slice(0, 60) + "..." : text;
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
}: MessageThreadProps) => {
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editContent, setEditContent]   = useState("");
  const [replyingTo, setReplyingTo]     = useState<ReplyContext | null>(null);

  // Tracks which message is awaiting delete confirmation in the hover toolbar
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const bottomRef = useRef<HTMLDivElement>(null);
  const dispatch  = useDispatch();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Clear both reply context and pending confirmation when switching rooms
  useEffect(() => {
    setReplyingTo(null);
    setConfirmDeleteId(null);
  }, [conversation?.id]);

  const canEdit = (msg: Message) => {
    const mins = (Date.now() - new Date(msg.timestamp).getTime()) / 60000;
    return msg.sender.id === currentUser.id && mins <= 15;
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

  const grouped = messages.reduce<Record<string, Message[]>>((acc, msg) => {
    const key = new Date(msg.timestamp).toDateString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(msg);
    return acc;
  }, {});

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

  const headerUser = conversation.type === "direct"
    ? (conversation.participants.find((p) => p.id !== currentUser.id)
        ?? conversation.participants[0]
        ?? { id: "", name: conversation.name, avatar: conversation.avatar })
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
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {Object.entries(grouped).map(([dateKey, dayMessages]) => (
          <div key={dateKey}>
            <div className="flex items-center justify-center my-6">
              <div className="bg-muted px-3 py-1 rounded-full">
                <span className="text-xs text-muted-foreground font-medium">
                  {formatDate(dayMessages[0].timestamp)}
                </span>
              </div>
            </div>

            {dayMessages.map((message, index) => {
              const isMe = message.sender.id === currentUser.id;
              const showAvatar = !isMe && (
                index === 0 || dayMessages[index - 1].sender.id !== message.sender.id
              );

              const populatedReply =
                message.replyTo && typeof message.replyTo === "object"
                  ? (message.replyTo as ReplyPreview)
                  : null;

              // Whether this message's toolbar is showing a delete confirmation
              const isConfirmingDelete = confirmDeleteId === message.id;

              return (
                <div
                  key={message.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"} group`}
                  // Clicking outside the toolbar clears any pending confirmation
                  onClick={() => {
                    if (isConfirmingDelete) setConfirmDeleteId(null);
                  }}
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
                      <div className={`px-4 py-2 rounded-2xl ${
                        isMe
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border text-card-foreground"
                      }`}>

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
                              {getReplyPreviewText(populatedReply)}
                            </p>
                          </div>
                        )}

                        {editingId === message.id ? (
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
                                if (editContent.trim()) onEditMessage(editingId!, editContent.trim());
                                setEditingId(null);
                              }}>Save</Button>
                              <Button size="xs" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <>
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
                        )}
                      </div>

                      {/* ── Hover Toolbar ─────────────────────────────────── */}
                      {editingId !== message.id && (
                        <div className={`absolute top-0 ${isMe ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
                          <div className="flex items-center space-x-1 bg-popover border border-border rounded-lg p-1 shadow-lg">

                            {/* ── DELETE CONFIRMATION STATE ────────────────
                                First click on trash → shows "Delete?" + Yes/No
                                Clicking Yes → actually deletes
                                Clicking No (or anywhere outside) → back to normal
                                This prevents accidental deletions. */}
                            {isConfirmingDelete ? (
                              <>
                                <span className="text-xs text-foreground px-1 whitespace-nowrap">
                                  Delete?
                                </span>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteMessage(message.id);
                                    setConfirmDeleteId(null);
                                  }}
                                >
                                  Yes
                                </Button>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteId(null);
                                  }}
                                >
                                  No
                                </Button>
                              </>
                            ) : (
                              <>
                                {/* ── NORMAL TOOLBAR STATE ── */}

                                {/* Reply button — sets reply context, shows banner in input */}
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  title="Reply"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReplyingTo({
                                      messageId: message.id,
                                      content:    message.content,
                                      type:       message.type,
                                      senderName: isMe ? "yourself" : message.sender.name,
                                    });
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
                                      setEditingId(message.id);
                                      setEditContent(message.content);
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
                                      // First click → show confirmation, don't delete yet
                                      setConfirmDeleteId(message.id);
                                    }}
                                  >
                                    <Icon name="Trash2" size={14} />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}

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
                </div>
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
        />
      </div>
    </div>
  );
};

export default MessageThread;