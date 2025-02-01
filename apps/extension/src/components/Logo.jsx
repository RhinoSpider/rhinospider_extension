// src/components/Logo.jsx
import React from 'react';

const Logo = ({ className = "" }) => {
  return (
    <div className={`font-mono ${className}`}>
      {">^<"}
    </div>
  );
};

export default Logo;