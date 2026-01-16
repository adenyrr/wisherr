import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useSiteStore } from '../utils/store';
import Sidebar from './Sidebar';
import Footer from './Footer';
import LucideIcon from './LucideIcon';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const siteTitle = useSiteStore((s) => s.siteTitle);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${!isMobile ? 'md:ml-72' : ''}`}>
        {/* Mobile Header */}
        {isMobile && (
          <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 bg-gray-900/95 backdrop-blur-xl border-b border-white/10">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
            >
              <LucideIcon name="menu" size={24} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <LucideIcon name="gift" size={18} className="text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                {siteTitle}
              </span>
            </div>
            <div className="w-10" /> {/* Spacer for centering */}
          </header>
        )}

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <Footer siteTitle={siteTitle} />
      </div>
    </div>
  );
}
