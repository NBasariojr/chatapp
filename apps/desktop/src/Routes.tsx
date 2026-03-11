import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "./redux/store";

// Shared chat pages (copy or symlink from web/src/pages)
import Login from "./pages/login";
import Register from "./pages/register";
import ChatDashboard from "./pages/chat-dashboard";
import GroupChatManagement from "./pages/group-chat-management";
import UserProfileSettings from "./pages/user-profile-settings";

// Admin-only pages (desktop exclusive)
import AdminLayout from "./admin/AdminLayout";
import AdminDashboard from "./admin/AdminDashboard";
import AdminUsers from "./admin/AdminUsers";
import AdminRooms from "./admin/AdminRooms";

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useSelector((state: RootState) => state.auth);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useSelector((state: RootState) => state.auth);
  return !token ? <>{children}</> : <Navigate to="/chat-dashboard" replace />;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, user } = useSelector((state: RootState) => state.auth);
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== "admin") return <Navigate to="/chat-dashboard" replace />;
  return <>{children}</>;
};

const Routes = () => {
  return (
    <BrowserRouter>
      <RouterRoutes>
        {/* Public */}
        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Protected chat routes */}
        <Route path="/chat-dashboard"        element={<PrivateRoute><ChatDashboard /></PrivateRoute>} />
        <Route path="/group-chat-management" element={<PrivateRoute><GroupChatManagement /></PrivateRoute>} />
        <Route path="/user-profile-settings" element={<PrivateRoute><UserProfileSettings /></PrivateRoute>} />

        {/* Admin routes — desktop only */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index         element={<AdminDashboard />} />
          <Route path="users"  element={<AdminUsers />} />
          <Route path="rooms"  element={<AdminRooms />} />
        </Route>

        {/* Default */}
        <Route path="/" element={<Navigate to="/chat-dashboard" replace />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/chat-dashboard" replace />} />
      </RouterRoutes>
    </BrowserRouter>
  );
};

export default Routes;