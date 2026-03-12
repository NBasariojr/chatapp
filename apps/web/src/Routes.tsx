import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";
import NotFound from "./pages/NotFound";
import Login from "./pages/login";
import Register from "./pages/register";
import ForgotPassword from "./pages/forgot-password";
import ChatDashboard from "./pages/chat-dashboard";
import GroupChatManagement from "./pages/group-chat-management";
import UserProfileSettings from "./pages/user-profile-settings";
import type { RootState } from "./redux/store";

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useSelector((state: RootState) => state.auth);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useSelector((state: RootState) => state.auth);
  const isAuthenticated = !!token;
  return isAuthenticated ? <Navigate to="/chat-dashboard" replace /> : <>{children}</>;
};

const Routes = () => {
  const { user: currentUser } = useSelector((state: RootState) => state.auth);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ErrorBoundary>
        <ScrollToTop />
        <RouterRoutes>
          {/* Public */}
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

          {/* Protected */}
          <Route path="/chat-dashboard"       element={<PrivateRoute><ChatDashboard /></PrivateRoute>} />
          <Route path="/group-chat-management" element={<PrivateRoute><GroupChatManagement /></PrivateRoute>} />
          <Route path="/user-profile-settings" element={<PrivateRoute><UserProfileSettings currentUser={currentUser} /></PrivateRoute>} />

          {/* Default */}
          <Route path="/" element={<Navigate to="/chat-dashboard" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;