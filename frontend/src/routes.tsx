import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './features/auth/pages/Login';
import Register from './features/auth/pages/Register';
import WishlistsNew from './features/wishlists/pages/WishlistsNew';
import WishlistDetail from './features/wishlists/pages/WishlistDetail';
import SharedWithMe from './features/wishlists/pages/SharedWithMe';
import PublicWishlist from './features/shares/pages/PublicWishlist';
import NotFound from './shared/components/NotFound';
import ProfileNew from './features/auth/pages/ProfileNew';
import Dashboard from './features/dashboard/pages/Dashboard';
import Groups from './features/groups/pages/Groups';
import SharesNew from './features/shares/pages/SharesNew';
import AdminConfig from './features/admin/pages/AdminConfig';
import AdminUsers from './features/admin/pages/AdminUsers';
import AdminStats from './features/admin/pages/AdminStats';
import AdminLogs from './features/admin/pages/AdminLogs';
import Notifications from './features/notifications/pages/Notifications';
import { useAuthStore } from './shared/utils/store';

export default function AppRoutes() {
  const token = useAuthStore(s => s.token);
  const currentUser = useAuthStore(s => s.currentUser);
  const isAdmin = currentUser?.is_admin || false;
  
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Public share access (no auth required) */}
      <Route path="/shared/:token" element={<PublicWishlist />} />
      
      {/* Dashboard */}
      <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" />} />
      
      {/* Wishlists */}
      <Route path="/wishlists" element={<Navigate to="/wishlists/mine" replace />} />
      <Route path="/wishlists/mine" element={token ? <WishlistsNew /> : <Navigate to="/login" />} />
      <Route path="/wishlists/shared" element={token ? <SharedWithMe /> : <Navigate to="/login" />} />
      <Route path="/wishlists/others" element={<Navigate to="/wishlists/shared" replace />} />
      <Route path="/wishlists/:id" element={token ? <WishlistDetail /> : <Navigate to="/login" />} />
      
      {/* Profile */}
      <Route path="/profile" element={token ? <ProfileNew /> : <Navigate to="/login" />} />
      
      {/* Notifications */}
      <Route path="/notifications" element={token ? <Notifications /> : <Navigate to="/login" />} />
      
      {/* Groups & Shares */}
      <Route path="/groups" element={token ? <Groups /> : <Navigate to="/login" />} />
      <Route path="/shares" element={token ? <SharesNew /> : <Navigate to="/login" />} />
      
      {/* Admin routes */}
      <Route path="/admin" element={token && isAdmin ? <Navigate to="/admin/stats" replace /> : <Navigate to="/login" />} />
      <Route path="/admin/config" element={token && isAdmin ? <AdminConfig /> : <Navigate to="/login" />} />
      <Route path="/admin/users" element={token && isAdmin ? <AdminUsers /> : <Navigate to="/login" />} />
      <Route path="/admin/stats" element={token && isAdmin ? <AdminStats /> : <Navigate to="/login" />} />
      <Route path="/admin/logs" element={token && isAdmin ? <AdminLogs /> : <Navigate to="/login" />} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

