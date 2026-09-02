import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type FontSize = 'normal' | 'large' | 'xlarge';

interface A11yContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  toggleHighContrast: () => void;
  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;
  toggleReducedMotion: () => void;
  dyslexicFont: boolean;
  setDyslexicFont: (enabled: boolean) => void;
  toggleDyslexicFont: () => void;
  announcement: string;
  announce: (message: string) => void;
  resetSettings: () => void;
}

const A11yContext = createContext<A11yContextType>({
  fontSize: 'normal',
  setFontSize: () => {},
  highContrast: false,
  setHighContrast: () => {},
  toggleHighContrast: () => {},
  reducedMotion: false,
  setReducedMotion: () => {},
  toggleReducedMotion: () => {},
  dyslexicFont: false,
  setDyslexicFont: () => {},
  toggleDyslexicFont: () => {},
  announcement: '',
  announce: () => {},
  resetSettings: () => {},
});

export const A11yProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    return (localStorage.getItem('omnibug_a11y_fontsize') as FontSize) || 'normal';
  });

  const [highContrast, setHighContrastState] = useState<boolean>(() => {
    return localStorage.getItem('omnibug_a11y_contrast') === 'true';
  });

  const [reducedMotion, setReducedMotionState] = useState<boolean>(() => {
    if (localStorage.getItem('omnibug_a11y_motion') !== null) {
      return localStorage.getItem('omnibug_a11y_motion') === 'true';
    }
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const [dyslexicFont, setDyslexicFontState] = useState<boolean>(() => {
    return localStorage.getItem('omnibug_a11y_dyslexic') === 'true';
  });

  const [announcement, setAnnouncement] = useState<string>('');

  const announce = useCallback((message: string) => {
    setAnnouncement(message);
    // Clear after 3 seconds so repeated identical messages trigger aria-live updates
    setTimeout(() => {
      setAnnouncement('');
    }, 3000);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    
    // 1. Font Size
    root.classList.remove('a11y-font-normal', 'a11y-font-large', 'a11y-font-xlarge');
    root.classList.add(`a11y-font-${fontSize}`);
    localStorage.setItem('omnibug_a11y_fontsize', fontSize);

    // 2. High Contrast
    if (highContrast) {
      root.classList.add('a11y-high-contrast');
    } else {
      root.classList.remove('a11y-high-contrast');
    }
    localStorage.setItem('omnibug_a11y_contrast', String(highContrast));

    // 3. Reduced Motion
    if (reducedMotion) {
      root.classList.add('a11y-reduced-motion');
    } else {
      root.classList.remove('a11y-reduced-motion');
    }
    localStorage.setItem('omnibug_a11y_motion', String(reducedMotion));

    // 4. Dyslexic Font
    if (dyslexicFont) {
      root.classList.add('a11y-dyslexic');
    } else {
      root.classList.remove('a11y-dyslexic');
    }
    localStorage.setItem('omnibug_a11y_dyslexic', String(dyslexicFont));
  }, [fontSize, highContrast, reducedMotion, dyslexicFont]);

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    announce(`Font size adjusted to ${size}`);
  };

  const toggleHighContrast = () => {
    setHighContrastState((prev) => {
      const next = !prev;
      announce(next ? 'High contrast mode enabled' : 'High contrast mode disabled');
      return next;
    });
  };

  const toggleReducedMotion = () => {
    setReducedMotionState((prev) => {
      const next = !prev;
      announce(next ? 'Reduced motion enabled' : 'Reduced motion disabled');
      return next;
    });
  };

  const toggleDyslexicFont = () => {
    setDyslexicFontState((prev) => {
      const next = !prev;
      announce(next ? 'Enhanced readability spacing enabled' : 'Standard spacing restored');
      return next;
    });
  };

  const resetSettings = () => {
    setFontSizeState('normal');
    setHighContrastState(false);
    setReducedMotionState(false);
    setDyslexicFontState(false);
    announce('Accessibility settings reset to default');
  };

  return (
    <A11yContext.Provider
      value={{
        fontSize,
        setFontSize,
        highContrast,
        setHighContrast: setHighContrastState,
        toggleHighContrast,
        reducedMotion,
        setReducedMotion: setReducedMotionState,
        toggleReducedMotion,
        dyslexicFont,
        setDyslexicFont: setDyslexicFontState,
        toggleDyslexicFont,
        announcement,
        announce,
        resetSettings,
      }}
    >
      {children}
    </A11yContext.Provider>
  );
};

export const useA11y = () => useContext(A11yContext);
