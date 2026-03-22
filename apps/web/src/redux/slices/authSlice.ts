import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser } from '@chatapp/shared';
import { authService } from 'services/auth.service';
import { setSentryUser, clearSentryUser } from '@/lib/sentry';

type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

// State Shape
export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;     // Local auth: login / register / fetchMe
  error: string | null;   // Local auth errors only
  // F014: Separate OAuth state — Google loading/error never bleeds into local login form
  isOAuthLoading: boolean;
  oauthError: string | null;
  forgotPassword: { status: AsyncStatus; error: string | null };
  resetPassword: { status: AsyncStatus; error: string | null };
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('chatapp_token'),
  isLoading: false,
  error: null,
  isOAuthLoading: false,
  oauthError: null,
  forgotPassword: { status: 'idle', error: null },
  resetPassword: { status: 'idle', error: null },
};

// Thunks
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

export const googleLogin = createAsyncThunk(
  'auth/googleLogin',
  async (code: string, { rejectWithValue }) => {
    try {
      const authUser = await authService.googleSignIn(code);
      localStorage.setItem('chatapp_token', authUser.token);
      return authUser;
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Google sign-in failed');
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.error = null;
      state.oauthError = null;
      localStorage.removeItem('chatapp_token');
      clearSentryUser();
    },
    clearError(state) {
      state.error = null;
    },
    clearOAuthError(state) {
      state.oauthError = null;
    },
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
        setSentryUser({ id: action.payload._id, role: action.payload.role });
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
        if (state.user) {
          setSentryUser({ id: state.user._id, role: state.user.role });
        }
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
        setSentryUser({ id: action.payload._id, role: action.payload.role });
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // googleLogin
    builder
      .addCase(googleLogin.pending, (state) => {
        state.isOAuthLoading = true;
        state.oauthError = null;
      })
      .addCase(googleLogin.fulfilled, (state, action: PayloadAction<AuthUser>) => {
        state.isOAuthLoading = false;
        state.oauthError = null;
        state.user = action.payload;
        state.token = action.payload.token;
        setSentryUser({ id: action.payload._id, role: action.payload.role });
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.isOAuthLoading = false;
        state.oauthError = action.payload as string;
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

export const {
  logout,
  clearError,
  clearOAuthError,
  clearForgotPasswordStatus,
  clearResetPasswordStatus,
} = authSlice.actions;

export default authSlice.reducer;