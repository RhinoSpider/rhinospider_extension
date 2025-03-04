import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Add global BigInt serialization handler
// This extends the JSON.stringify method to handle BigInt values
if (!('toJSON' in BigInt.prototype)) {
  Object.defineProperty(BigInt.prototype, 'toJSON', {
    value: function() {
      return Number(this);
    }
  });
}

// Alternatively, we could replace the JSON.stringify method globally
const originalStringify = JSON.stringify;
JSON.stringify = function(value, replacer, space) {
  const bigintReplacer = (key, val) => {
    if (typeof val === 'bigint') {
      return Number(val);
    }
    return (replacer ? replacer(key, val) : val);
  };
  
  return originalStringify(value, replacer || bigintReplacer, space);
};

console.log('BigInt serialization handler installed');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
