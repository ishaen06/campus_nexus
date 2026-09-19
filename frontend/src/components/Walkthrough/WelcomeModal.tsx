import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Users, FolderGit, Sparkles, ArrowRight, X } from 'lucide-react';
import { useWalkthrough } from './WalkthroughContext';

export const WelcomeModal: React.FC = () => {
  const { isWelcomeOpen, startTour, closeWelcome } = useWalkthrough();

  if (!isWelcomeOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9995] flex items-center justify-center p-4 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeWelcome}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 overflow-hidden text-center"
        >
          {/* Top Decorative Gradient */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />

          {/* Close button */}
          <button
            onClick={closeWelcome}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>

          {/* Glowing Icon Badge */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-lg shadow-indigo-600/10 mb-5">
            <Sparkles size={30} className="text-indigo-600 dark:text-indigo-400" />
          </div>

          {/* Title & Subtitle */}
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Welcome to Campus Nexus
          </h2>
          <p className="text-slate-600 dark:text-slate-300 font-medium text-sm sm:text-base mt-2.5 max-w-sm mx-auto leading-relaxed">
            Let's get you from finding teammates to building your project team.
          </p>

          {/* Three Feature Pillars */}
          <div className="grid grid-cols-3 gap-3 my-6 text-left">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-white/5 flex flex-col gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Compass size={16} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block">01</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Connect</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-white/5 flex flex-col gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Users size={16} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block">02</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Build</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-white/5 flex flex-col gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <FolderGit size={16} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block">03</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Manage</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => startTour(0)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/30 transition-all cursor-pointer uppercase tracking-wider"
            >
              Start Walkthrough
              <ArrowRight size={14} />
            </button>
            <button
              onClick={closeWelcome}
              className="py-3 px-5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 transition-all cursor-pointer"
            >
              Skip for now
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
