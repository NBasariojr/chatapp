// web/src/redux/slices/chatSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { Room, Message } from "@chatapp/shared";
import { chatService } from "../../services/chat.service";

export interface ChatState {
  rooms: Room[];
  activeRoomId: string | null;
  messages: Record<string, Message[]>;
  unreadCounts: Record<string, number>;
  typingUsers: Record<string, string[]>;
  isLoading: boolean;
  error: string | null;
  pendingMessages: Record<string, string>;
  hasMore: Record<string, boolean>;
  isLoadingMore: boolean;
}

const initialState: ChatState = {
  rooms: [],
  activeRoomId: null,
  messages: {},
  unreadCounts: {},
  typingUsers: {},
  isLoading: false,
  error: null,
  pendingMessages: {},
  hasMore: {},
  isLoadingMore: false,
};

export const fetchRooms = createAsyncThunk(
  "chat/fetchRooms",
  async (_, { rejectWithValue }) => {
    try {
      return await chatService.getRooms();
    } catch (err) {
      return rejectWithValue(
        err instanceof Error ? err.message : "Failed to fetch rooms",
      );
    }
  },
);

export const fetchMessages = createAsyncThunk(
  "chat/fetchMessages",
  async (
    { roomId, before }: { roomId: string; before?: string },
    { rejectWithValue },
  ) => {
    try {
      const data = await chatService.getMessages(roomId, { before });
      return { roomId, messages: data.messages, hasMore: data.hasMore, before };
    } catch (err) {
      return rejectWithValue(
        err instanceof Error ? err.message : "Failed to fetch messages",
      );
    }
  },
);

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveRoom(state, action: PayloadAction<string | null>) {
      state.activeRoomId = action.payload;
    },

    addMessage(
      state,
      action: PayloadAction<{ roomId: string; message: Message }>,
    ) {
      const { roomId, message } = action.payload;
      if (!state.messages[roomId]) state.messages[roomId] = [];
      const alreadyExists = state.messages[roomId].some(
        (m) => m._id === message._id,
      );
      if (alreadyExists) return;
      state.messages[roomId].push(message);
      const room = state.rooms.find((r) => r._id === roomId);
      if (room) room.lastMessage = message;
    },

    removeMessage(
      state,
      action: PayloadAction<{ roomId: string; messageId: string }>,
    ) {
      const { roomId, messageId } = action.payload;
      if (!state.messages[roomId]) return;
      state.messages[roomId] = state.messages[roomId].filter(
        (m) => m._id !== messageId,
      );
      // Clear lastMessage on the room if it was the one deleted
      const room = state.rooms.find((r) => r._id === roomId);
      if (room?.lastMessage?._id === messageId) {
        room.lastMessage = undefined;
      }
    },

    updateMessage(
      state,
      action: PayloadAction<{ roomId: string; messageId: string; content: string }>,
    ) {
      const { roomId, messageId, content } = action.payload;
      if (!state.messages[roomId]) return;
      const message = state.messages[roomId].find((m) => m._id === messageId);
      if (message) {
        message.content = content;
      }
    },

    setTyping(
      state,
      action: PayloadAction<{
        roomId: string;
        userId: string;
        isTyping: boolean;
      }>,
    ) {
      const { roomId, userId, isTyping } = action.payload;
      if (!state.typingUsers[roomId]) state.typingUsers[roomId] = [];
      if (isTyping) {
        if (!state.typingUsers[roomId].includes(userId)) {
          state.typingUsers[roomId].push(userId);
        }
      } else {
        state.typingUsers[roomId] = state.typingUsers[roomId].filter(
          (id) => id !== userId,
        );
      }
    },

    updateUserStatus(
      state,
      action: PayloadAction<{ userId: string; isOnline: boolean }>,
    ) {
      const { userId, isOnline } = action.payload;
      state.rooms.forEach((room) => {
        const participant = room.participants.find((p) => p._id === userId);
        if (participant) participant.isOnline = isOnline;
      });
    },

    addOptimisticMessage(
      state,
      action: PayloadAction<{ roomId: string; message: Message; tempId: string }>,
    ) {
      const { roomId, message, tempId } = action.payload;
      if (!state.messages[roomId]) state.messages[roomId] = [];
      state.messages[roomId].push(message);
      state.pendingMessages[tempId] = roomId;
    },

    confirmMessage(
      state,
      action: PayloadAction<{ tempId: string; message: Message }>,
    ) {
      const { tempId, message } = action.payload;
      const roomId = state.pendingMessages[tempId];
      if (!roomId || !state.messages[roomId]) return;

      state.messages[roomId] = state.messages[roomId].filter(
        (m) => m._id !== tempId,
      );

      const alreadyExists = state.messages[roomId].some(
        (m) => m._id === message._id,
      );
      if (!alreadyExists) {
        state.messages[roomId].push(message);
      }

      const room = state.rooms.find((r) => r._id === roomId);
      if (room) room.lastMessage = message;

      delete state.pendingMessages[tempId];
    },

    rejectMessage(state, action: PayloadAction<{ tempId: string }>) {
      const { tempId } = action.payload;
      const roomId = state.pendingMessages[tempId];
      if (!roomId || !state.messages[roomId]) return;

      state.messages[roomId] = state.messages[roomId].filter(
        (m) => m._id !== tempId,
      );
      delete state.pendingMessages[tempId];
    },

    prependMessages(
      state,
      action: PayloadAction<{ roomId: string; messages: Message[] }>,
    ) {
      const { roomId, messages } = action.payload;
      if (!state.messages[roomId]) state.messages[roomId] = [];
      // Prepend older messages, dedup against what's already loaded
      const existingIds = new Set(state.messages[roomId].map((m) => m._id));
      const newMessages = messages.filter((m) => !existingIds.has(m._id));
      state.messages[roomId] = [...newMessages, ...state.messages[roomId]];
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.rooms = action.payload;
      })
      // Initial load (no before cursor) — replace messages
      // Load more (before cursor present) — prepend older messages
      .addCase(fetchMessages.pending, (state, action) => {
        if (action.meta.arg.before) {
          state.isLoadingMore = true;
        } else {
          state.isLoading = true;
        }
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const { roomId, messages, hasMore, before } = action.payload;
        state.hasMore[roomId] = hasMore;
        state.isLoading = false;
        state.isLoadingMore = false;

        if (before) {
          // Load more — prepend, dedup
          if (!state.messages[roomId]) state.messages[roomId] = [];
          const existingIds = new Set(state.messages[roomId].map((m) => m._id));
          const newMessages = messages.filter((m) => !existingIds.has(m._id));
          state.messages[roomId] = [...newMessages, ...state.messages[roomId]];
        } else {
          // Initial load — replace
          state.messages[roomId] = messages;
        }
      })
      .addCase(fetchMessages.rejected, (state) => {
        state.isLoading = false;
        state.isLoadingMore = false;
      });
  },
});

export const {
  setActiveRoom,
  addMessage,
  removeMessage,
  updateMessage,
  setTyping,
  updateUserStatus,
  addOptimisticMessage,
  confirmMessage,
  rejectMessage,
  prependMessages,
} = chatSlice.actions;

export default chatSlice.reducer;