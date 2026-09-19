import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWalkthrough } from './WalkthroughContext';
import { WalkthroughTooltip } from './WalkthroughTooltip';

export const WalkthroughOverlay: React.FC = () => {
  const {
    isActive,
    currentStep,
    targetRect,
    nextStep,
    prevStep,
    skipTour,
    finishTour
  } = useWalkthrough();

  if (!isActive || !currentStep) return null;

  const padding = 8;
  const spotlightX = targetRect ? Math.max(0, targetRect.left - padding) : 0;
  const spotlightY = targetRect ? Math.max(0, targetRect.top - padding) : 0;
  const spotlightW = targetRect ? targetRect.width + padding * 2 : 0;
  const spotlightH = targetRect ? targetRect.height + padding * 2 : 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9990] pointer-events-none overflow-hidden select-none">
        {/* SVG Mask Overlay for Dimmed Background with Rounded Spotlight Cutout */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-auto"
          style={{ width: '100vw', height: '100vh' }}
        >
          <defs>
            <mask id="nexus-tour-mask">
              {/* White fills the screen (opaque mask) */}
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {/* Black cuts out the spotlight hole */}
              {targetRect && (
                <rect
                  x={spotlightX}
                  y={spotlightY}
                  width={spotlightW}
                  height={spotlightH}
                  rx="18"
                  ry="18"
                  fill="black"
                />
              )}
            </mask>
          </defs>

          {/* Dimmed background rectangle applying the mask */}
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(10, 15, 30, 0.72)"
            mask="url(#nexus-tour-mask)"
            className="transition-all duration-300"
          />
        </svg>

        {/* Highlight ring & spotlight glow around the target */}
        {targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{
              opacity: 1,
              scale: 1,
              top: spotlightY,
              left: spotlightX,
              width: spotlightW,
              height: spotlightH
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="absolute rounded-2xl pointer-events-none border-2 border-indigo-500/80 shadow-[0_0_0_4px_rgba(99,102,241,0.25),0_0_30px_rgba(99,102,241,0.35)]"
          />
        )}

        {/* Tooltip Coach Mark */}
        <WalkthroughTooltip
          step={currentStep}
          targetRect={targetRect}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipTour}
          onFinish={finishTour}
        />
      </div>
    </AnimatePresence>
  );
};
