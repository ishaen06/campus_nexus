import React from 'react';
import { useA11y } from '../context/A11yContext';

export const A11yAnnouncer: React.FC = () => {
  const { announcement } = useA11y();

  return (
    <div
      id="a11y-announcer"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
};
