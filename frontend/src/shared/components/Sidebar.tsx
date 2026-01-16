import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../utils/store';
import LucideIcon from './LucideIcon';
import api from '../utils/api';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = currentUser?.is_admin || false;
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    lists: true,
    management: true,
    admin: isAdmin // Déployé par défaut pour les admins
  });

  // Fetch notification count
  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const res = await api.get('/notifications/count');
        setUnreadNotifications(res.data.unread);
      } catch (err) {
        // Silently fail
      }
    };
    fetchNotificationCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    onClose();
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
      isActive
        ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/30'
        : 'text-gray-400 hover:text-white hover:bg-white/5'
    }`;

  const subNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2 ml-4 rounded-lg transition-all duration-200 text-sm ${
      isActive
        ? 'bg-indigo-500/10 text-indigo-400'
        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
    }`;

  const mdUp = typeof window !== 'undefined' && window.innerWidth >= 768;

  const content = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-white/10">
        <NavLink to="/dashboard" className="flex items-center gap-3" onClick={onClose}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <LucideIcon name="gift" size={22} className="text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Wisherr
          </span>
        </NavLink>
        <button
          onClick={onClose}
          className="md:hidden p-2 rounded-lg hover:bg-white/10 text-gray-400"
        >
          <LucideIcon name="x" size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
        {/* Accueil */}
        <NavLink to="/dashboard" className={navLinkClass} onClick={onClose}>
          <LucideIcon name="home" size={20} />
          <span>{t('Accueil')}</span>
        </NavLink>

        {/* Profil */}
        <NavLink to="/profile" className={navLinkClass} onClick={onClose}>
          <LucideIcon name="user" size={20} />
          <span>{t('Profil')}</span>
        </NavLink>

        {/* Notifications */}
        <NavLink to="/notifications" className={navLinkClass} onClick={onClose}>
          <div className="relative">
            <LucideIcon name="bell" size={20} />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </div>
          <span>{t('Notifications')}</span>
          {unreadNotifications > 0 && (
            <span className="ml-auto px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
              {unreadNotifications}
            </span>
          )}
        </NavLink>

        {/* Section Listes */}
        <div className="mt-4">
          <button
            onClick={() => toggleSection('lists')}
            className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400"
          >
            <span>{t('Listes')}</span>
            <LucideIcon 
              name={expandedSections.lists ? 'chevron-down' : 'chevron-right'} 
              size={16} 
            />
          </button>
          
          {expandedSections.lists && (
            <div className="space-y-1 mt-1">
              <NavLink to="/wishlists/mine" className={subNavLinkClass} onClick={onClose}>
                <LucideIcon name="list" size={18} />
                <span>{t('Mes listes')}</span>
              </NavLink>
              <NavLink to="/wishlists/shared" className={subNavLinkClass} onClick={onClose}>
                <LucideIcon name="users" size={18} />
                <span>{t('Autres listes')}</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* Section Gestion */}
        <div className="mt-2">
          <button
            onClick={() => toggleSection('management')}
            className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400"
          >
            <span>{t('Gestion')}</span>
            <LucideIcon 
              name={expandedSections.management ? 'chevron-down' : 'chevron-right'} 
              size={16} 
            />
          </button>
          
          {expandedSections.management && (
            <div className="space-y-1 mt-1">
              <NavLink to="/shares" className={subNavLinkClass} onClick={onClose}>
                <LucideIcon name="share-2" size={18} />
                <span>{t('Partages')}</span>
              </NavLink>
              <NavLink to="/groups" className={subNavLinkClass} onClick={onClose}>
                <LucideIcon name="users" size={18} />
                <span>{t('Famille & Groupes')}</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* Section Admin (si admin) */}
        {isAdmin && (
          <div className="mt-2">
            <button
              onClick={() => toggleSection('admin')}
              className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-amber-500/70 uppercase tracking-wider hover:text-amber-400"
            >
              <span>{t('Administration')}</span>
              <LucideIcon 
                name={expandedSections.admin ? 'chevron-down' : 'chevron-right'} 
                size={16} 
              />
            </button>
            
            {expandedSections.admin && (
              <div className="space-y-1 mt-1">
                <NavLink to="/admin/config" className={subNavLinkClass} onClick={onClose}>
                  <LucideIcon name="settings" size={18} />
                  <span>{t('Configuration')}</span>
                </NavLink>
                <NavLink to="/admin/users" className={subNavLinkClass} onClick={onClose}>
                  <LucideIcon name="users" size={18} />
                  <span>{t('Membres')}</span>
                </NavLink>
                <NavLink to="/admin/stats" className={subNavLinkClass} onClick={onClose}>
                  <LucideIcon name="bar-chart-3" size={18} />
                  <span>{t('Statistiques')}</span>
                </NavLink>
                <NavLink to="/admin/logs" className={subNavLinkClass} onClick={onClose}>
                  <LucideIcon name="scroll-text" size={18} />
                  <span>{t('Logs')}</span>
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* User info + Logout */}
        {currentUser && (
          <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {currentUser.username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {currentUser.username}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {currentUser.email}
                </p>
              </div>
              {isAdmin && (
                <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full">
                  Admin
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
            >
              <LucideIcon name="log-out" size={16} />
              <span>{t('Déconnexion')}</span>
            </button>
          </div>
        )}
      </nav>
    </div>
  );

  if (mdUp) {
    return (
      <div className="fixed left-0 top-0 w-72 h-screen bg-gray-900/95 backdrop-blur-xl border-r border-white/10 z-40">
        {content}
      </div>
    );
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose}>
          <div 
            className="fixed left-0 top-0 w-72 h-full bg-gray-900/95 backdrop-blur-xl border-r border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </div>
        </div>
      )}
    </>
  );
}

