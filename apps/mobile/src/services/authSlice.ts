// mobile/src/services/authSlice.ts
// Note: React Native doesn't have localStorage.
// Install @react-native-async-storage/async-storage for persistent token storage.
// For simplicity here we use in-memory token (you'd add AsyncStorage in production).
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import type { AuthUser, User } from '@chatapp/shared';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, credentials);
      return res.data.data as AuthUser;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action: PayloadAction<AuthUser>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;