import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ExternalLink, 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles, 
  Copy, 
  Check, 
  FileText, 
  Save, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { GOOGLE_FORM_APPS_SCRIPT } from '../utils/feedbackScript';

export default function Feedback() {
  const navigate = useNavigate();
  const [feedbackUrl, setFeedbackUrl] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  
  // Admin setup form states
  const [inputUrl, setInputUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  useEffect(() => {
    // 1. Fetch current feedback link configuration
    api.get('/users/feedback-link')
      .then(res => {
        const url = (res.data?.url || '').trim();
        const configured = Boolean(res.data?.is_configured && url && !url.includes('campusnexus-feedback') && url.startsWith('http'));
        setFeedbackUrl(configured ? url : '');
        setIsConfigured(configured);
        setInputUrl(configured ? url : '');

        // If already configured and respondent is a student, auto-open in new tab
        if (configured && !window.location.search.includes('edit=true')) {
          // Check if admin before auto-opening
          api.get('/users/me').then(userRes => {
            const adminCheck = userRes.data?.is_admin || (userRes.data?.email || '').trim().toLowerCase() === 'ishaen.vihaan@gmail.com';
            setIsAdmin(adminCheck);
            if (!adminCheck) {
              window.open(url, '_blank', 'noopener,noreferrer');
            }
          }).catch(() => {
            window.open(url, '_blank', 'noopener,noreferrer');
          });
        }
      })
      .catch(() => {
        setIsConfigured(false);
      })
      .finally(() => {
        setIsLoading(false);
      });

    // 2. Determine admin permissions
    api.get('/users/me')
      .then(res => {
        const adminStatus = res.data?.is_admin || (res.data?.email || '').trim().toLowerCase() === 'ishaen.vihaan@gmail.com';
        setIsAdmin(adminStatus);
      })
      .catch(() => {});
  }, []);

  const handleOpenForm = () => {
    if (feedbackUrl) {
      window.open(feedbackUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyScriptAndLaunch = () => {
    try {
      navigator.clipboard.writeText(GOOGLE_FORM_APPS_SCRIPT);
    } catch (_) {}
    setCopiedScript(true);
    window.open('https://script.new', '_blank', 'noopener,noreferrer');
    setTimeout(() => setCopiedScript(false), 4000);
  };

  const handleSaveFormUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = inputUrl.trim();
    if (!cleanUrl.startsWith('http')) {
      alert("Please enter a valid Google Form URL (starting with https://)");
      return;
    }

    setIsSaving(true);
    try {
      await api.put('/admin/academic-settings', {
        google_form_feedback_url: cleanUrl
      });
      setFeedbackUrl(cleanUrl);
      setIsConfigured(true);
      setIsEditing(false);
      setSaveSuccessMsg("Google Form connected successfully! All students clicking 'Feedback' will now open this form.");
      setTimeout(() => setSaveSuccessMsg(''), 6000);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to save Google Form link");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = () => {
    if (feedbackUrl) {
      navigator.clipboard.writeText(feedbackUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-400">
          <Loader2 size={20} className="animate-spin text-purple-600" />
          <span>Loading feedback configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 p-4 md:p-8 flex flex-col items-center justify-center transition-colors">
      <div className="max-w-xl w-full space-y-6">
        
        {/* Navigation & Header */}
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

        {/* Success Alert Banner */}
        <AnimatePresence>
          {saveSuccessMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2.5 shadow-sm"
            >
              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CASE 1: Form is Configured & Ready */}
        {isConfigured && !isEditing ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-10 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6"
          >
            {/* Google Forms Accent Icon */}
            <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-[#673ab7] dark:text-purple-300 mx-auto flex items-center justify-center shadow-md">
              <FileText size={32} />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100">
                Campus Nexus App Feedback
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                The full app experience survey is hosted directly on Google Forms. Click below to share your thoughts and help shape the platform.
              </p>
            </div>

            {/* Primary Action Button */}
            <div className="pt-2">
              <button
                onClick={handleOpenForm}
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
                All responses are collected directly into the administrator's private Google account (<span className="font-semibold text-slate-700 dark:text-slate-300">Ishaen Bethur</span>). Individual submissions are strictly confidential.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-4 text-xs font-bold">
              <button
                onClick={handleCopyLink}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                {copiedLink ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                {copiedLink ? 'Link Copied!' : 'Copy Form Link'}
              </button>

              {isAdmin && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Settings size={13} /> Update Form URL
                  </button>
                </>
              )}
            </div>
          </motion.div>
        ) : isAdmin ? (
          /* CASE 2: Admin Setup Wizard (When URL is not configured or admin is editing) */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-purple-200 dark:border-purple-900/60 shadow-xl space-y-6 text-left"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#673ab7] dark:text-purple-400 flex items-center gap-1.5">
                  <Sparkles size={13} /> Administrator Setup
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  Connect Your Google Form
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                <AlertCircle size={12} /> Action Needed
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Because Google Forms require an owner account, running our automated script in your Google account creates the form with all 16 questions directly in your Google Drive. <strong>Only you</strong> will have owner access to the responses!
            </p>

            {/* Step 1: Copy Script & Launch script.new */}
            <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#673ab7] dark:text-purple-300 uppercase tracking-wider">
                  Step 1: Generate Form with Script (15 Sec)
                </span>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Click below to copy the generator script to your clipboard and open Google Apps Script:
              </p>

              <button
                type="button"
                onClick={handleCopyScriptAndLaunch}
                className="w-full py-3 px-4 rounded-xl bg-[#673ab7] hover:bg-[#5e35b1] text-white font-extrabold text-xs transition-all shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedScript ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedScript ? "Copied! Opening script.new..." : "Copy Script & Open script.new"}</span>
                <ExternalLink size={14} />
              </button>

              <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-purple-100 dark:border-purple-900/40 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <p className="font-bold text-slate-700 dark:text-slate-300">In the new tab that opens:</p>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px]">Ctrl+V</kbd> to paste the script into the editor.</li>
                  <li>Click the floppy disk icon (💾 <strong>Save</strong>), then click the play button (▶ <strong>Run</strong>).</li>
                  <li>Grant Google permissions when prompted.</li>
                  <li>Copy the <strong>PUBLIC STUDENT FORM URL</strong> from the Execution log at the bottom.</li>
                </ol>
              </div>
            </div>

            {/* Step 2: Paste Published URL */}
            <form onSubmit={handleSaveFormUrl} className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Step 2: Paste Your Published Form URL
                </label>
                <input
                  type="url"
                  required
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://docs.google.com/forms/d/e/.../viewform"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-medium text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSaving || !inputUrl.trim()}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>{isSaving ? "Connecting..." : "Save & Connect Form"}</span>
                </button>

                {isConfigured && isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        ) : (
          /* CASE 3: Student View When Form Is Not Configured Yet */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-10 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <Clock size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                Feedback Survey Coming Soon
              </h2>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                The full app feedback survey is currently being finalized by the platform administration. Please check back shortly to share your experience!
              </p>
            </div>

            <button
              onClick={() => navigate(-1)}
              className="py-3 px-6 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
            >
              Back to Dashboard
            </button>
          </motion.div>
        )}

      </div>
    </div>
  );
}

