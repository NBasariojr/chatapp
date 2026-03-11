// mobile/src/services/chatSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import type { Room, Message } from '@chatapp/shared';
import type { RootState } from './store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

interface ChatState {
  rooms: Room[];
  messages: Record<string, Message[]>;
  isLoading: boolean;
}

const initialState: ChatState = { rooms: [], messages: {}, isLoading: false };

export const fetchRooms = createAsyncThunk(
  'chat/fetchRooms',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState() as RootState;
      const res = await axios.get(`${API_URL}/api/rooms`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      return res.data.data as Room[];
    } catch {
      return rejectWithValue('Failed to fetch rooms');
    }
  }
);

export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async ({ roomId }: { roomId: string }, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState() as RootState;
      const res = await axios.get(`${API_URL}/api/messages/${roomId}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      return { roomId, messages: res.data.data.messages as Message[] };
    } catch {
      return rejectWithValue('Failed to fetch messages');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage(state, action: PayloadAction<{ roomId: string; message: Message }>) {
      const { roomId, message } = action.payload;
      if (!state.messages[roomId]) state.messages[roomId] = [];
      state.messages[roomId].push(message);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRooms.fulfilled, (state, action) => { state.rooms = action.payload; })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const { roomId, messages } = action.payload;
        state.messages[roomId] = messages;
      });
  },
});

export const { addMessage } = chatSlice.actions;
export default chatSlice.reducer;