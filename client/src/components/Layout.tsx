// src/components/Layout.tsx (Final, Professional Version)

import React, { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import VoiceAssistant from './VoiceAssistant';
import { Menu, Wallet, User as UserIcon } from 'lucide-react'; // Import necessary icons

const Layout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // A helper to close the menu, useful for link clicks in the header
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    // The main container is now a vertical flex column.
    // It stacks the Header on top of the main content area.
    <div className="flex flex-col h-screen bg-gray-100">
      
      {/* === 1. PERSISTENT HEADER === */}
      <header className="flex-shrink-0 bg-white shadow-md z-30">
  
          
          {/* Left Side of Header */}
          <div className="flex items-center gap-2">
            {/* Hamburger Menu Button (Only shows on screens smaller than lg) */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-800" />
            </button>
          

          {/* Right Side of Header (e.g., User Profile, Notifications) */}
        
        </div>
      </header>

      {/* === 2. MAIN CONTENT WRAPPER === */}
      {/* This container uses flexbox to place the Sidebar and Outlet side-by-side.
          'flex-1' makes it fill the remaining vertical space.
          'overflow-hidden' prevents double scrollbars. */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* The Sidebar component is now inside the main content wrapper */}
        <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

        {/* The scrollable area for the page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* The Outlet remains the placeholder for your page components */}
          <Outlet />
        </main>
      </div>

      <VoiceAssistant />
    </div>
  );
};

export default Layout;