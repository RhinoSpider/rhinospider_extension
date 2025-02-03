import React from 'react';
import { Login } from '@rhinospider/ui';

export const App: React.FC = () => {
  return (
    <div>
      <Login onSuccess={() => console.log('Logged in!')} />
    </div>
  );
};
