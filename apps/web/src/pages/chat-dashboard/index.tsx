// apps/web/src/pages/chat-dashboard/index.tsx
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "redux/store";
import type { ReplyPreview, Message, User } from "@chatapp/shared";
import {
  fetchRooms,
  fetchMessages,
  setActiveRoom,
  addOptimisticMessage,
  confirmMessage,
  rejectMessage,
} from "redux/slices/chatSlice";
import {
  joinRoom,
  sendTyping,
  stopTyping,
  sendMessageWithAck,
} from "services/socket.service";
import { chatService } from "services/chat.service";
import Header from "components/ui/Header";
import ConversationList from "./components/ConversationList";
import MessageThread from "./components/MessageThread";
import ConversationDetails from "./components/ConversationDetails";
import type { Theme } from "./components/ThemeModal";
import type { SystemEvent } from "./types";

// ─── localStorage helpers ─────────────────────────────────────────────────────

const THEMES_STORAGE_KEY        = "linkup:roomThemes";
const SYSTEM_EVENTS_STORAGE_KEY = "linkup:roomSystemEvents";

const loadRoomThemes = (): Record<string, Theme> => {
  try {
    const raw = localStorage.getItem(THEMES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Theme>) : {};
  } catch {
    return {};
  }
};

const saveRoomThemes = (themes: Record<string, Theme>): void => {
  try {
    localStorage.setItem(THEMES_STORAGE_KEY, JSON.stringify(themes));
  } catch {}
};

const MAX_EVENTS_PER_ROOM = 50;

const loadRoomSystemEvents = (): Record<string, SystemEvent[]> => {
  try {
    const raw = localStorage.getItem(SYSTEM_EVENTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, SystemEvent[]>;
    Object.values(parsed).forEach((events) => {
      events.forEach((e) => { e.timestamp = new Date(e.timestamp); });
    });
    return parsed;
  } catch {
    return {};
  }
};

const saveRoomSystemEvents = (events: Record<string, SystemEvent[]>): void => {
  try {
    localStorage.setItem(SYSTEM_EVENTS_STORAGE_KEY, JSON.stringify(events));
  } catch (error) {
    console.error("Error saving room system events:", error);
  }
};

const ChatDashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { rooms, messages, activeRoomId } = useSelector(
    (state: RootState) => state.chat,
  );

  const [showDetails, setShowDetails] = useState(false);
  const [isMobile, setIsMobile]       = useState(window.innerWidth < 768);

  // ── Per-room theme map ───────────────────────────────────────────────────
  const [roomThemes, setRoomThemes] = useState<Record<string, Theme>>(
    loadRoomThemes,
  );
  useEffect(() => { saveRoomThemes(roomThemes); }, [roomThemes]);

  // ── Per-room system events ───────────────────────────────────────────────
  const [roomSystemEvents, setRoomSystemEvents] = useState<
    Record<string, SystemEvent[]>
  >(loadRoomSystemEvents);
  useEffect(() => { saveRoomSystemEvents(roomSystemEvents); }, [roomSystemEvents]);

  const handleThemeChange = (theme: Theme) => {
    if (!activeRoomId || !user) return;

    setRoomThemes((prev) => ({ ...prev, [activeRoomId]: theme }));

    const event: SystemEvent = {
      id:        `sys-${crypto.randomUUID()}`,
      roomId:    activeRoomId,
      type:      "system",
      content:   theme.name,    // ← store only the theme name, not the full sentence
      timestamp: new Date(),
      actorId:   user._id,      // ← who made the change
      actorName: user.username, // ← their display name
    };

    setRoomSystemEvents((prev) => {
      const existing = prev[activeRoomId] ?? [];
      const updated  = [...existing, event].slice(-MAX_EVENTS_PER_ROOM);
      return { ...prev, [activeRoomId]: updated };
    });
  };

  const activeTheme        = activeRoomId ? roomThemes[activeRoomId]        : undefined;
  const activeSystemEvents = activeRoomId ? (roomSystemEvents[activeRoomId] ?? []) : [];

  const activeConversation = rooms?.find((r) => r._id === activeRoomId) ?? null;
  const activeMessages     = activeRoomId ? (messages[activeRoomId] ?? []) : [];

  useEffect(() => { dispatch(fetchRooms()); }, [dispatch]);

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
    if (!activeRoomId || !user) return;

    const tempId = `temp_${crypto.randomUUID()}`;

    // Build optimistic message — shown immediately in the UI
    const optimisticMessage: Message = {
      _id: tempId,
      content: messageData.content,
      type: messageData.type,
      status: 'sent',
      sender: user as User,
      roomId: activeRoomId,
      replyTo: messageData.replyTo ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dispatch(addOptimisticMessage({ roomId: activeRoomId, message: optimisticMessage, tempId }));

    try {
      const confirmed = await sendMessageWithAck({
        roomId: activeRoomId,
        content: messageData.content,
        type: messageData.type,
        replyTo: messageData.replyTo,
      });
      // Replace optimistic placeholder with server-confirmed message
      dispatch(confirmMessage({ tempId, message: confirmed }));
    } catch (err) {
      // Remove placeholder and surface the error
      dispatch(rejectMessage({ tempId }));
      console.error('[handleSendMessage] Failed to deliver:', err);
      // TODO: Replace alert with a toast notification (Milestone 8)
      alert(`Message failed to send: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleEditMessage = async (messageId: string, content: string) => {
    try {
      await chatService.editMessage(messageId, content);
    } catch (err) {
      console.error("[handleEditMessage] Failed:", err);
      alert(`Failed to edit message: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await chatService.deleteMessage(messageId);
    } catch (err) {
      console.error("[handleDeleteMessage] Failed:", err);
      alert(`Failed to delete message: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const currentUser = user
    ? {
        id:     user._id,
        name:   user.username,
        avatar: user.avatar,
        status: "online" as const,
        role:   user.role,
      }
    : { id: "", name: "", status: "online" as const };

  const conversations =
    rooms?.map((room) => ({
      id:   room._id,
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
          id:     p._id,
          name:   p.username,
          avatar: p.avatar,
          status: p.isOnline ? ("online" as const) : ("offline" as const),
          role:   p.role,
        }),
      ),
      lastMessage: room.lastMessage
        ? {
            id:        room.lastMessage._id,
            content:   room.lastMessage.content,
            type:      room.lastMessage.type,
            timestamp: room.lastMessage.createdAt,
            sender: {
              id:   room.lastMessage.sender?._id ?? room.lastMessage.sender,
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
      id:      m._id,
      content: m.content,
      type:    m.type as "text" | "image" | "file",
      sender: {
        id:     m.sender._id,
        name:   m.sender.username,
        avatar: m.sender.avatar,
        role:   m.sender.role,
      },
      timestamp: new Date(m.createdAt),
      status:    (m.status ?? "sent") as "sent" | "delivered" | "read",
      replyTo:   m.replyTo,
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
            theme={activeTheme}
            systemEvents={activeSystemEvents}
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
                onThemeChange={handleThemeChange}
                activeThemeId={activeTheme?.id}
              />
            </div>
          ) : (
            <ConversationDetails
              conversation={mappedActive}
              onClose={() => setShowDetails(false)}
              currentUser={currentUser}
              onThemeChange={handleThemeChange}
              activeThemeId={activeTheme?.id}
            />
          ))}
      </div>
    </div>
  );
};

export default ChatDashboard;