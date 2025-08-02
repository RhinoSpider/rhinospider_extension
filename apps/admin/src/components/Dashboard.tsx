import React, { useEffect } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Overview } from './Overview';
import { ScrapingConfig } from './ScrapingConfig';
import { Nodes } from './Nodes';
import { ScrapedData } from './ScrapedData';

const CURRENT_VIEW_KEY = 'admin_current_view';

export const Dashboard: React.FC = () => {
  const [currentView, setCurrentView] = React.useState(() => {
    return localStorage.getItem(CURRENT_VIEW_KEY) || 'overview';
  });

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    localStorage.setItem(CURRENT_VIEW_KEY, view);
  };

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return <Overview />;
      case 'config':
        return <ScrapingConfig />;
      case 'users':
        return <Nodes />;
      case 'data':
        return <ScrapedData />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="min-h-screen bg-[#131217]">
      <Navbar />
      <div className="flex">
        <Sidebar currentView={currentView} onViewChange={handleViewChange} />
        <main className="flex-1 p-8">
          {renderView()}
        </main>
      </div>
    </div>
  );
};
