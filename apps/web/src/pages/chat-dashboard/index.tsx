// apps/web/src/pages/chat-dashboard/index.tsx
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "redux/store";
import type { ReplyPreview } from "@chatapp/shared";
import {
  fetchRooms,
  fetchMessages,
  setActiveRoom,
} from "redux/slices/chatSlice";
import {
  joinRoom,
  sendTyping,
  stopTyping,
} from "services/socket.service";
import { chatService } from "services/chat.service";
import Icon from "components/AppIcon";
import Header from "components/ui/Header";
import ConversationList from "./components/ConversationList";
import MessageThread from "./components/MessageThread";
import ConversationDetails from "./components/ConversationDetails";

const ChatDashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, token } = useSelector((state: RootState) => state.auth);
  const { rooms, messages, activeRoomId } = useSelector(
    (state: RootState) => state.chat,
  );

  const [showDetails, setShowDetails] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const activeConversation = rooms?.find((r) => r._id === activeRoomId) ?? null;
  const activeMessages     = activeRoomId ? (messages[activeRoomId] ?? []) : [];

  useEffect(() => {
    dispatch(fetchRooms());
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleConversationSelect = (conversation: { id: string }) => {
    dispatch(setActiveRoom(conversation.id));
    dispatch(fetchMessages({ roomId: conversation.id }));
    joinRoom(conversation.id);
    if (isMobile) setShowDetails(false);
  };

  const handleSendMessage = async (messageData: {
    type: "text" | "image" | "file";
    content: string;
    fileName?: string;
    fileSize?: string;
    replyTo?: string;
  }) => {
    if (!activeRoomId) return;
    await chatService.sendMessage(
      activeRoomId,
      messageData.content,
      messageData.type,
      messageData.replyTo,
    );
  };

  // ← FIXED: was /* TODO */ — now calls the API and lets the socket
  // event (message:updated) update the Redux store for all clients
  const handleEditMessage = async (messageId: string, content: string) => {
    try {
      await chatService.editMessage(messageId, content);
      // Note: no manual Redux dispatch needed here.
      // The backend emits message:updated via socket, which the
      // socket.service.ts listener catches and dispatches updateMessage().
      // This keeps the update flow identical for the sender and all
      // other users in the room.
    } catch (err) {
      console.error("[handleEditMessage] Failed:", err);
    }
  };

  // ← FIXED: was /* TODO */ — now calls the API and lets the socket
  // event (message:deleted) update the Redux store for all clients
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await chatService.deleteMessage(messageId);
      // Same pattern as edit — no manual Redux dispatch.
      // The backend emits message:deleted via socket, which the
      // socket.service.ts listener catches and dispatches removeMessage().
    } catch (err) {
      console.error("[handleDeleteMessage] Failed:", err);
    }
  };

  const currentUser = user
    ? {
        id: user._id,
        name: user.username,
        avatar: user.avatar,
        status: "online" as const,
        role: user.role,
      }
    : { id: "", name: "", status: "online" as const };

  const conversations =
    rooms?.map((room) => ({
      id: room._id,
      type: room.isGroup ? ("group" as const) : ("direct" as const),
      name:
        room.name ||
        (room.isGroup
          ? room.participants
              ?.map((p: { username: string }) => p.username)
              .join(", ")
          : (room.participants?.find(
              (p: { _id: string }) => p._id !== user?._id,
            )?.username ?? "Unknown")),
      avatar: room.avatar,
      participants: (room.participants ?? []).map(
        (p: {
          _id: string;
          username: string;
          avatar?: string;
          isOnline?: boolean;
          role?: string;
        }) => ({
          id: p._id,
          name: p.username,
          avatar: p.avatar,
          status: p.isOnline ? ("online" as const) : ("offline" as const),
          role: p.role,
        }),
      ),
      lastMessage: room.lastMessage
        ? {
            id: room.lastMessage._id,
            content: room.lastMessage.content,
            type: room.lastMessage.type,
            timestamp: room.lastMessage.createdAt,
            sender: {
              id: room.lastMessage.sender?._id ?? room.lastMessage.sender,
              name: room.lastMessage.sender?.username ?? "Unknown",
            },
          }
        : undefined,
      unreadCount: 0,
    })) ?? [];

  const mappedMessages = activeMessages.map(
    (m: {
      _id: string;
      content: string;
      type: string;
      sender: { _id: string; username: string; avatar?: string; role?: string };
      createdAt: string;
      status?: string;
      replyTo?: ReplyPreview | string | null;
    }) => ({
      id: m._id,
      content: m.content,
      type: m.type as "text" | "image" | "file",
      sender: {
        id: m.sender._id,
        name: m.sender.username,
        avatar: m.sender.avatar,
        role: m.sender.role,
      },
      timestamp: new Date(m.createdAt),
      status: (m.status ?? "sent") as "sent" | "delivered" | "read",
      replyTo: m.replyTo,
    }),
  );

  const mappedActive = activeConversation
    ? (conversations.find((c) => c.id === activeRoomId) ?? null)
    : null;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {(!isMobile || !mappedActive) && <Header />}

      <div
        className="relative flex flex-1 overflow-hidden"
        style={{ paddingTop: !isMobile || !mappedActive ? "64px" : "0" }}
      >
        {/* ── Sidebar ── */}
        <div
          className={[
            "flex-shrink-0 flex flex-col h-full",
            isMobile ? "w-full" : "w-80",
            isMobile && activeConversation ? "hidden" : "",
          ].join(" ")}
        >
          <ConversationList
            conversations={conversations}
            activeConversation={mappedActive}
            onConversationSelect={handleConversationSelect}
            currentUser={currentUser}
          />
        </div>

        {/* ── Message Thread ── */}
        <div
          className={[
            "flex flex-col flex-1 h-full overflow-hidden",
            isMobile && !activeConversation ? "hidden" : "",
          ].join(" ")}
        >
          <MessageThread
            conversation={mappedActive}
            messages={mappedMessages}
            currentUser={currentUser}
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onTyping={(typing) => {
              if (activeRoomId) {
                typing ? sendTyping(activeRoomId) : stopTyping(activeRoomId);
              }
            }}
            showDetails={showDetails}
            onToggleDetails={() => setShowDetails(!showDetails)}
          />
        </div>

        {showDetails &&
          mappedActive &&
          (isMobile ? (
            <div className="fixed inset-0 z-50 flex flex-col bg-background">
              <ConversationDetails
                conversation={mappedActive}
                onClose={() => setShowDetails(false)}
                onBack={() => setShowDetails(false)}
                currentUser={currentUser}
                className="w-full"
              />
            </div>
          ) : (
            <ConversationDetails
              conversation={mappedActive}
              onClose={() => setShowDetails(false)}
              currentUser={currentUser}
            />
          ))}
      </div>
    </div>
  );
};

export default ChatDashboard;