// web/src/redux/slices/chatSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Room, Message } from '@chatapp/shared';
import { chatService } from '../../services/chat.service';

interface ChatState {
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

export const fetchRooms = createAsyncThunk('chat/fetchRooms', async (_, { rejectWithValue }) => {
  try {
    return await chatService.getRooms();
  } catch (err) {
    return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch rooms');
  }
});

export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async ({ roomId, page = 1 }: { roomId: string; page?: number }, { rejectWithValue }) => {
    try {
      const data = await chatService.getMessages(roomId, page);
      return { roomId, messages: data.messages };
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch messages');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveRoom(state, action: PayloadAction<string | null>) {
      state.activeRoomId = action.payload;
    },
    addMessage(state, action: PayloadAction<{ roomId: string; message: Message }>) {
      const { roomId, message } = action.payload;
      if (!state.messages[roomId]) state.messages[roomId] = [];
      state.messages[roomId].push(message);

      // Update last message in room list
      const room = state.rooms.find((r) => r._id === roomId);
      if (room) room.lastMessage = message;
    },
    setTyping(state, action: PayloadAction<{ roomId: string; userId: string; isTyping: boolean }>) {
      const { roomId, userId, isTyping } = action.payload;
      if (!state.typingUsers[roomId]) state.typingUsers[roomId] = [];

      if (isTyping) {
        if (!state.typingUsers[roomId].includes(userId)) {
          state.typingUsers[roomId].push(userId);
        }
      } else {
        state.typingUsers[roomId] = state.typingUsers[roomId].filter((id) => id !== userId);
      }
    },
    updateUserStatus(state, action: PayloadAction<{ userId: string; isOnline: boolean }>) {
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

export const { setActiveRoom, addMessage, setTyping, updateUserStatus } = chatSlice.actions;
export default chatSlice.reducer;