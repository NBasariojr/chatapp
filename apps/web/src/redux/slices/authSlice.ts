import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser } from '@chatapp/shared';
import { authService } from 'services/auth.service';

type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  forgotPassword: { status: AsyncStatus; error: string | null };
  resetPassword: { status: AsyncStatus; error: string | null };
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('chatapp_token'),
  isLoading: false,
  error: null,
  forgotPassword: { status: 'idle', error: null },
  resetPassword: { status: 'idle', error: null },
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const authUser = await authService.login(credentials);
      localStorage.setItem('chatapp_token', authUser.token);
      return authUser;
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (data: { username: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      const authUser = await authService.register(data);
      localStorage.setItem('chatapp_token', authUser.token);
      return authUser;
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Registration failed');
    }
  }
);

export const fetchMe = createAsyncThunk(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authService.getMe();
      return user;
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch user');
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      await authService.forgotPassword(email);
    } catch (err: unknown) {
      return rejectWithValue(
        err instanceof Error ? err.message : 'Request failed. Please try again.'
      );
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (
    payload: { token: string; password: string; confirmPassword: string },
    { rejectWithValue }
  ) => {
    try {
      await authService.resetPassword(payload.token, payload.password, payload.confirmPassword);
    } catch (err: unknown) {
      return rejectWithValue(
        err instanceof Error ? err.message : 'Reset failed. Please try again.'
      );
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      localStorage.removeItem('chatapp_token');
    },
    clearError(state) {
      state.error = null;
    },
    // Called on page unmount to prevent stale status on re-entry
    clearForgotPasswordStatus(state) {
      state.forgotPassword = { status: 'idle', error: null };
    },
    clearResetPasswordStatus(state) {
      state.resetPassword = { status: 'idle', error: null };
    },
  },
  extraReducers: (builder) => {
    // register
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<AuthUser>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.token = action.payload.token;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // fetchMe
    builder
      .addCase(fetchMe.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = state.token ? { ...action.payload, token: state.token } : null;
      })
      .addCase(fetchMe.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<AuthUser>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // forgotPassword
    builder
      .addCase(forgotPassword.pending, (state) => {
        state.forgotPassword = { status: 'loading', error: null };
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.forgotPassword = { status: 'success', error: null };
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.forgotPassword = { status: 'error', error: action.payload as string };
      });

    // resetPassword
    builder
      .addCase(resetPassword.pending, (state) => {
        state.resetPassword = { status: 'loading', error: null };
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.resetPassword = { status: 'success', error: null };
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.resetPassword = { status: 'error', error: action.payload as string };
      });
  },
});

export const { logout, clearError, clearForgotPasswordStatus, clearResetPasswordStatus } =
  authSlice.actions;
export default authSlice.reducer;