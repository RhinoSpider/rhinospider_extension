import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Overview } from './Overview';
import { ScrapingConfig } from './ScrapingConfig';
import { ExtensionUsers } from './ExtensionUsers';
import { ScrapedData } from './ScrapedData';

export const Dashboard: React.FC = () => {
  const [currentView, setCurrentView] = React.useState('overview');

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return <Overview />;
      case 'config':
        return <ScrapingConfig />;
      case 'users':
        return <ExtensionUsers />;
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
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />
        <main className="flex-1 p-8">
          {renderView()}
        </main>
      </div>
    </div>
  );
};
