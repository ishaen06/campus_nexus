import React from 'react';

export const SkipLink: React.FC = () => {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-[#0070f2] focus:text-white focus:font-bold focus:text-sm focus:rounded-md focus:shadow-2xl focus:outline-none focus:ring-4 focus:ring-amber-400"
    >
      Skip to main content (Press Enter)
    </a>
  );
};
