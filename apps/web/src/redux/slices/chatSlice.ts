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
}

const initialState: ChatState = {
  rooms: [],
  activeRoomId: null,
  messages: {},
  unreadCounts: {},
  typingUsers: {},
  isLoading: false,
  error: null,
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
    { roomId, page = 1 }: { roomId: string; page?: number },
    { rejectWithValue },
  ) => {
    try {
      const data = await chatService.getMessages(roomId, page);
      return { roomId, messages: data.messages };
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

    // ← ADDED: called by socket.service when message:deleted fires
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

    // ← ADDED: called by socket.service when message:updated fires
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
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.rooms = action.payload;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const { roomId, messages } = action.payload;
        state.messages[roomId] = messages;
      });
  },
});

export const {
  setActiveRoom,
  addMessage,
  removeMessage,    // ← ADDED
  updateMessage,    // ← ADDED
  setTyping,
  updateUserStatus,
} = chatSlice.actions;

export default chatSlice.reducer;