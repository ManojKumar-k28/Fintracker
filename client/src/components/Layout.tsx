import React from 'react';
import Sidebar from './Sidebar';
import VoiceAssistant from './VoiceAssistant';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto lg:ml-0">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
          {children}
        </div>
      </main>
      <VoiceAssistant />
    </div>
  );
};

export default Layout;