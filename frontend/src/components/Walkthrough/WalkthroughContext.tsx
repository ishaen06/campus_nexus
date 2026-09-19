import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TOUR_STEPS, type TourStepConfig } from './WalkthroughTypes';

interface WalkthroughContextType {
  isActive: boolean;
  currentStepIndex: number;
  currentStep: TourStepConfig | null;
  targetRect: DOMRect | null;
  targetElement: HTMLElement | null;
  isWelcomeOpen: boolean;
  startTour: (startStep?: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  finishTour: () => void;
  closeWelcome: () => void;
  openWelcome: () => void;
}

const WalkthroughContext = createContext<WalkthroughContextType | undefined>(undefined);

const STORAGE_KEY_COMPLETED = 'campus_nexus_tour_completed';
const STORAGE_KEY_DISMISSED = 'campus_nexus_tour_dismissed';

export const WalkthroughProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(false);

  const location = useLocation();
  const navigate = useNavigate();
  const retryTimerRef = useRef<any>(null);

  const currentStep = isActive ? TOUR_STEPS[currentStepIndex] || null : null;

  // Check first-time user status
  useEffect(() => {
    const isCompleted = localStorage.getItem(STORAGE_KEY_COMPLETED) === 'true';
    const isDismissed = localStorage.getItem(STORAGE_KEY_DISMISSED) === 'true';

    // Show welcome modal for students on initial landing if never completed/dismissed
    if (!isCompleted && !isDismissed) {
      const timer = setTimeout(() => {
        // Only trigger on main student pages, not auth or admin
        if (!location.pathname.startsWith('/admin') && location.pathname !== '/login' && location.pathname !== '/profile-setup') {
          setIsWelcomeOpen(true);
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  // Update target rect based on element
  const updateTargetRect = useCallback(() => {
    if (!targetElement) {
      setTargetRect(null);
      return;
    }
    const rect = targetElement.getBoundingClientRect();
    setTargetRect(rect);
  }, [targetElement]);

  // Recalculate target position on scroll or resize
  useEffect(() => {
    if (!isActive) return;

    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);

    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [isActive, updateTargetRect]);

  // Locate target element for current step
  const locateTarget = useCallback((step: TourStepConfig) => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
    }

    let attempts = 0;
    const maxAttempts = 25; // 25 * 120ms = ~3 seconds max wait for async page mount

    const findEl = () => {
      const el = document.querySelector(step.targetSelector) as HTMLElement | null;

      if (el) {
        setTargetElement(el);
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);

        // Scroll into view if needed with padding
        const isInViewport =
          rect.top >= 80 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) - 80;

        if (!isInViewport) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Recalculate rect after scroll completes
          setTimeout(() => {
            const updated = el.getBoundingClientRect();
            setTargetRect(updated);
          }, 350);
        }
      } else if (attempts < maxAttempts) {
        attempts++;
        retryTimerRef.current = setTimeout(findEl, 120);
      } else {
        // If element is not found, fallback to centering in window
        setTargetElement(null);
        setTargetRect(null);
      }
    };

    findEl();
  }, []);

  // Handle step changes and route navigation
  useEffect(() => {
    if (!isActive || !currentStep) {
      setTargetElement(null);
      setTargetRect(null);
      return;
    }

    // Call onEnter hook if present
    if (currentStep.onEnter) {
      currentStep.onEnter();
    }

    // Check if route transition is required
    if (currentStep.route && location.pathname !== currentStep.route) {
      navigate(currentStep.route);
      // Wait for route to transition then locate target
      const timer = setTimeout(() => {
        locateTarget(currentStep);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      locateTarget(currentStep);
    }

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [isActive, currentStepIndex, location.pathname, navigate, locateTarget]);

  // Controls
  const startTour = (startStep = 0) => {
    setIsWelcomeOpen(false);
    setCurrentStepIndex(startStep);
    setIsActive(true);
  };

  const nextStep = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      finishTour();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const skipTour = () => {
    setIsActive(false);
    setTargetElement(null);
    setTargetRect(null);
    localStorage.setItem(STORAGE_KEY_DISMISSED, 'true');
  };

  const finishTour = () => {
    setIsActive(false);
    setTargetElement(null);
    setTargetRect(null);
    localStorage.setItem(STORAGE_KEY_COMPLETED, 'true');
  };

  const closeWelcome = () => {
    setIsWelcomeOpen(false);
    localStorage.setItem(STORAGE_KEY_DISMISSED, 'true');
  };

  const openWelcome = () => {
    setIsWelcomeOpen(true);
  };

  return (
    <WalkthroughContext.Provider
      value={{
        isActive,
        currentStepIndex,
        currentStep,
        targetRect,
        targetElement,
        isWelcomeOpen,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        finishTour,
        closeWelcome,
        openWelcome
      }}
    >
      {children}
    </WalkthroughContext.Provider>
  );
};

export const useWalkthrough = (): WalkthroughContextType => {
  const context = useContext(WalkthroughContext);
  if (!context) {
    throw new Error('useWalkthrough must be used within a WalkthroughProvider');
  }
  return context;
};
