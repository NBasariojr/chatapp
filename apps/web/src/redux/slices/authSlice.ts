// web/src/redux/slices/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser, User } from '@chatapp/shared';
import { authService } from '../../services/auth.service';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem('chatapp_token');
  } catch {
    return null;
  }
};

const initialState: AuthState = {
  user: null,
  token: getStoredToken(),
  isLoading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      return await authService.login(credentials);
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (data: { username: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      return await authService.register(data);
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Registration failed');
    }
  }
);

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    return await authService.getMe();
  } catch (err) {
    return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch user');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.error = null;
      try {
        localStorage.removeItem('chatapp_token');
      } catch {}
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const handleAuthFulfilled = (state: AuthState, action: PayloadAction<AuthUser>) => {
      state.isLoading = false;
      state.user = action.payload;
      state.token = action.payload.token;
      state.error = null;
      try {
        localStorage.setItem('chatapp_token', action.payload.token);
      } catch {}
    };

    builder
      .addCase(login.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(login.fulfilled, handleAuthFulfilled)
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(register.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(register.fulfilled, handleAuthFulfilled)
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchMe.fulfilled, (state, action: PayloadAction<User>) => {
        state.user = action.payload;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;