import React from 'react';

export const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  </div>
);

export const LoadingSkeleton = ({ type = 'default' }) => {
  if (type === 'analytics') {
    return (
      <div className="p-4 space-y-4">
        {/* Chart skeleton */}
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        {/* Stats grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 bg-gray-200 rounded animate-pulse">
              <div className="h-4 w-20 bg-gray-300 mb-2"></div>
              <div className="h-6 w-16 bg-gray-300"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'settings') {
    return (
      <div className="p-4 space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    );
  }

  // Default loading skeleton
  return (
    <div className="p-4 space-y-4">
      <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
      <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse"></div>
      <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
    </div>
  );
};

export const ErrorState = ({ message, retry }) => (
  <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
    <div className="text-red-500 mb-4">
      <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h3 className="text-lg font-semibold mb-2">Error Loading Content</h3>
    <p className="text-gray-600 mb-4">{message || 'Something went wrong. Please try again.'}</p>
    {retry && (
      <button
        onClick={retry}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Retry
      </button>
    )}
  </div>
);
