import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, ArrowLeft, ShieldCheck, Sparkles, Copy, Check, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Feedback() {
  const navigate = useNavigate();
  const [feedbackUrl, setFeedbackUrl] = useState<string>('https://docs.google.com/forms/d/e/1FAIpQLScampusnexus-feedback/viewform');
  const [isAdmin, setIsAdmin] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    // 1. Fetch live feedback form link from backend
    api.get('/users/feedback-link')
      .then(res => {
        if (res.data?.url) {
          setFeedbackUrl(res.data.url);
          // Automatically open in new tab
          window.open(res.data.url, '_blank', 'noopener,noreferrer');
        }
      })
      .catch(() => {
        window.open(feedbackUrl, '_blank', 'noopener,noreferrer');
      });

    // 2. Check if current user is admin
    api.get('/users/me')
      .then(res => {
        const adminStatus = res.data?.is_admin || (res.data?.email || '').trim().toLowerCase() === 'ishaen.vihaan@gmail.com';
        setIsAdmin(adminStatus);
      })
      .catch(() => {});
  }, []);

  const handleManualOpen = () => {
    window.open(feedbackUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyScriptInstructions = () => {
    const code = `// 1. Open https://script.new in your browser (logged into ishaen.vihaan@gmail.com)
// 2. Paste code from create_google_form.gs and click Run (Play button)
// 3. The Google Form with all 16 questions is created in your Google Drive!`;
    navigator.clipboard.writeText(code);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(feedbackUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 p-4 md:p-8 flex flex-col items-center justify-center transition-colors">
      <div className="max-w-xl w-full space-y-6">
        
        {/* Back button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} /> Back to App
          </button>

          <span className="text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
            Google Forms Survey
          </span>
        </div>

        {/* Main Launcher Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-10 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6"
        >
          {/* Google Forms Purple Accent Icon */}
          <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-[#673ab7] dark:text-purple-300 mx-auto flex items-center justify-center shadow-md">
            <FileText size={32} />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100">
              Campus Nexus App Feedback
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              The full app experience survey is hosted directly on Google Forms. A new tab should have opened automatically. If not, click below to proceed.
            </p>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2">
            <button
              onClick={handleManualOpen}
              className="w-full py-4 px-6 rounded-2xl bg-[#673ab7] hover:bg-[#5e35b1] text-white font-extrabold text-sm transition-all duration-200 shadow-lg shadow-purple-600/20 hover:shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Open Google Form Now</span>
              <ExternalLink size={16} />
            </button>
          </div>

          {/* Confidentiality Notice */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/80 text-left space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <ShieldCheck size={15} className="text-emerald-500" />
              <span>Admin Confidentiality Guarantee</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              All responses are collected exclusively into the administrator's private Google account (<span className="font-semibold text-slate-700 dark:text-slate-300">Ishaen Bethur</span>). Individual submissions are confidential and never publicly exposed.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2 text-xs">
            <button
              onClick={handleCopyLink}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold flex items-center gap-1 cursor-pointer"
            >
              {copiedLink ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              {copiedLink ? 'Link Copied!' : 'Copy Form Link'}
            </button>
          </div>
        </motion.div>

        {/* Admin Setup Guide Card (Only visible to Ishaen Bethur / Admin) */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-purple-200 dark:border-purple-900/60 shadow-lg space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#673ab7] dark:text-purple-400 flex items-center gap-1.5">
                <Sparkles size={13} /> Administrator Hub (Ishaen Bethur)
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">1-Click Form Setup</span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              The automated script <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[11px]">create_google_form.gs</code> generates all 16 questions directly in your personal Google Drive so <strong>only you</strong> have owner access to the responses spreadsheet.
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyScriptInstructions}
                className="flex-1 py-2 px-3 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-[#673ab7] dark:text-purple-300 text-xs font-bold transition-colors border border-purple-200 dark:border-purple-800 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedScript ? <Check size={13} /> : <Copy size={13} />}
                {copiedScript ? 'Instructions Copied!' : 'Copy 15-Sec Setup Steps'}
              </button>

              <button
                onClick={() => navigate('/admin/academic')}
                className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Edit URL in Settings →
              </button>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
