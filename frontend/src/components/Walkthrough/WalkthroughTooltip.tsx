import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, X, Sparkles, Check } from 'lucide-react';
import { type TourStepConfig } from './WalkthroughTypes';

interface WalkthroughTooltipProps {
  step: TourStepConfig;
  targetRect: DOMRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onFinish: () => void;
}

export const WalkthroughTooltip: React.FC<WalkthroughTooltipProps> = ({
  step,
  targetRect,
  onNext,
  onPrev,
  onSkip,
  onFinish
}) => {
  const isFirstStep = step.stepNumber === 1;
  const isLastStep = step.stepNumber === step.totalSteps;

  // Calculate dynamic position
  const tooltipStyle = useMemo(() => {
    const isMobile = window.innerWidth < 640;
    const tooltipWidth = isMobile ? Math.min(window.innerWidth - 32, 380) : 380;
    const estimatedHeight = 260;
    const margin = 16;

    // Default fallback: centered in window if no target rect
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: `${tooltipWidth}px`
      };
    }

    if (isMobile) {
      // On mobile devices, position at bottom of screen or under target safely
      if (targetRect.bottom + estimatedHeight + margin < window.innerHeight) {
        return {
          top: `${targetRect.bottom + margin}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          width: `${tooltipWidth}px`
        };
      } else if (targetRect.top - estimatedHeight - margin > 10) {
        return {
          top: `${Math.max(10, targetRect.top - estimatedHeight - margin)}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          width: `${tooltipWidth}px`
        };
      } else {
        return {
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: `${tooltipWidth}px`
        };
      }
    }

    const placement = step.preferredPlacement || 'bottom';

    let top = 0;
    let left = 0;

    if (placement === 'bottom') {
      top = targetRect.bottom + margin;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;

      // Check overflow bottom
      if (top + estimatedHeight > window.innerHeight - margin) {
        // Flip to top
        top = Math.max(margin, targetRect.top - estimatedHeight - margin);
      }
    } else if (placement === 'top') {
      top = targetRect.top - estimatedHeight - margin;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;

      // Check overflow top
      if (top < margin) {
        // Flip to bottom
        top = targetRect.bottom + margin;
      }
    } else if (placement === 'right') {
      top = targetRect.top + targetRect.height / 2 - estimatedHeight / 2;
      left = targetRect.right + margin;

      // Check overflow right
      if (left + tooltipWidth > window.innerWidth - margin) {
        // Flip to left or bottom
        if (targetRect.left - tooltipWidth - margin > margin) {
          left = targetRect.left - tooltipWidth - margin;
        } else {
          top = targetRect.bottom + margin;
          left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        }
      }
    } else if (placement === 'left') {
      top = targetRect.top + targetRect.height / 2 - estimatedHeight / 2;
      left = targetRect.left - tooltipWidth - margin;

      // Check overflow left
      if (left < margin) {
        // Flip to right
        left = targetRect.right + margin;
      }
    }

    // Clamp horizontal position within viewport
    left = Math.max(margin, Math.min(window.innerWidth - tooltipWidth - margin, left));
    top = Math.max(margin, Math.min(window.innerHeight - estimatedHeight - margin, top));

    return {
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`
    };
  }, [targetRect, step.preferredPlacement]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={tooltipStyle}
      className="fixed z-[9999] pointer-events-auto select-none"
    >
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col gap-3.5 relative overflow-hidden">
        {/* Subtle accent glow line at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />

        {/* Header: Section badge, step counter, and close button */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40 shadow-xs">
              <Sparkles size={10} className="text-indigo-500 animate-pulse" />
              {step.sectionNumber} — {step.sectionTitle}
            </span>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400">
              {step.stepNumber} of {step.totalSteps}
            </span>
          </div>

          <button
            onClick={onSkip}
            title="Skip Tour"
            className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-1.5 text-left">
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug">
            {step.title}
          </h3>
          <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Footer: Navigation controls & Skip option */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 mt-1">
          <button
            onClick={onSkip}
            className="text-[11px] font-bold text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer px-1 py-1"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                onClick={onPrev}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/10 transition-all cursor-pointer"
              >
                <ArrowLeft size={13} />
                Back
              </button>
            )}

            {isLastStep ? (
              <button
                onClick={onFinish}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer uppercase tracking-wider"
              >
                <Check size={14} />
                Finish
              </button>
            ) : (
              <button
                onClick={onNext}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 transition-all cursor-pointer"
              >
                Next
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
