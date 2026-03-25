import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { GoogleOAuthProvider } from '@react-oauth/google';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';
import type { RootState } from './redux/store';

// ─── Eagerly loaded — on the critical path for /login render ─────────────────
import NotFound from './pages/NotFound';

// ─── Lazy loaded — downloaded only when the route is visited ─────────────────
// This is the primary FCP fix. Static imports force the browser to download
// and parse every page before rendering anything. Lazy imports split each page
// into its own chunk fetched on demand.
const Login               = lazy(() => import('./pages/login'));
const Register            = lazy(() => import('./pages/register'));
const ForgotPassword      = lazy(() => import('./pages/forgot-password'));
const ResetPassword       = lazy(() => import('./pages/reset-password'));
const ChatDashboard       = lazy(() => import('./pages/chat-dashboard'));
const GroupChatManagement = lazy(() => import('./pages/group-chat-management'));
const UserProfileSettings = lazy(() => import('./pages/user-profile-settings'));

// Google OAuth Client ID
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
if (!GOOGLE_CLIENT_ID && import.meta.env.DEV) {
  console.warn('[Routes] VITE_GOOGLE_CLIENT_ID is not set — Google OAuth will fail');
}

// Minimal spinner shown while a lazy chunk loads.
// Kept intentionally plain — it appears for <200ms on fast connections.
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// Route Guards
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useSelector((state: RootState) => state.auth);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useSelector((state: RootState) => state.auth);
  return token ? <Navigate to="/chat-dashboard" replace /> : <>{children}</>;
};

// Routes
const Routes = () => {
  const { user: currentUser } = useSelector((state: RootState) => state.auth);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ErrorBoundary>
        <ScrollToTop />
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <Suspense fallback={<PageLoader />}>
            <RouterRoutes>
              {/* Public */}
              <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
              <Route path="/forgot-password"       element={<PublicRoute><ForgotPassword /></PublicRoute>} />
              <Route path="/reset-password/:token" element={<PublicRoute><ResetPassword /></PublicRoute>} />

              {/* Protected */}
              <Route path="/chat-dashboard"        element={<PrivateRoute><ChatDashboard /></PrivateRoute>} />
              <Route path="/group-chat-management" element={<PrivateRoute><GroupChatManagement /></PrivateRoute>} />
              <Route path="/user-profile-settings" element={<PrivateRoute><UserProfileSettings currentUser={currentUser} /></PrivateRoute>} />

              {/* Default */}
              <Route path="/" element={<Navigate to="/chat-dashboard" replace />} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </RouterRoutes>
          </Suspense>
        </GoogleOAuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;