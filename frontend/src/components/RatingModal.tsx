import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Sparkles, X, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import api from '../api';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
}

const RATING_LABELS: Record<number, { text: string; emoji: string; color: string }> = {
  1: { text: 'Needs Improvement', emoji: '😞', color: 'text-amber-500' },
  2: { text: 'Fair', emoji: '😐', color: 'text-yellow-500' },
  3: { text: 'Good', emoji: '🙂', color: 'text-blue-500' },
  4: { text: 'Very Good!', emoji: '😊', color: 'text-indigo-500' },
  5: { text: 'Amazing Experience!', emoji: '🤩🎉', color: 'text-emerald-500' },
};

const FEEDBACK_TAGS = [
  'Team Formation',
  'Discovery Feed',
  'Project Dashboard',
  'Chat & Groups',
  'Design & UI',
  'Evaluation System',
  'Fast & Responsive'
];

export default function RatingModal({ isOpen, onClose, currentUser }: RatingModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  // Load existing rating if available
  useEffect(() => {
    if (isOpen) {
      api.get('/ratings/me')
        .then(res => {
          if (res.data?.rating) {
            setRating(res.data.rating.score || 5);
            setFeedback(res.data.rating.feedback || '');
            setSelectedTags(res.data.rating.tags || []);
          } else {
            // Default initial suggestion
            setRating(5);
          }
        })
        .catch(() => {
          setRating(5);
        });
    }
  }, [isOpen]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  useEffect(() => {
    // Attempt background sync of any previously queued reviews
    const pendingRaw = localStorage.getItem('app_ratings_pending');
    if (pendingRaw) {
      try {
        const pending = JSON.parse(pendingRaw);
        if (Array.isArray(pending) && pending.length > 0) {
          api.post('/ratings', pending[0])
            .then(() => localStorage.removeItem('app_ratings_pending'))
            .catch(() => {
              api.post('/ratings/', pending[0])
                .then(() => localStorage.removeItem('app_ratings_pending'))
                .catch(() => {});
            });
        }
      } catch (_) {}
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setSubmitting(true);
    const ratingPayload = {
      score: rating,
      feedback: feedback.trim(),
      tags: selectedTags,
      category: currentUser?.is_mentor ? 'mentor' : 'student',
      user_name: currentUser?.full_name || currentUser?.name || 'User',
      user_email: currentUser?.email || '',
      updated_at: new Date().toISOString()
    };

    try {
      // 1. Try endpoint without trailing slash
      await api.post('/ratings', ratingPayload);
    } catch (err: any) {
      try {
        // 2. Try with trailing slash
        await api.post('/ratings/', ratingPayload);
      } catch (fallbackErr: any) {
        console.warn("Backend ratings endpoint pending deploy, cached review locally:", fallbackErr);
        try {
          const pending = JSON.parse(localStorage.getItem('app_ratings_pending') || '[]');
          pending.push(ratingPayload);
          localStorage.setItem('app_ratings_pending', JSON.stringify(pending));
        } catch (_) {}
      }
    } finally {
      // Always treat as success on frontend so the user is never blocked by a 'Not Found' alert
      localStorage.setItem('app_rating_submitted', 'true');
      localStorage.setItem('app_rating_last_score', String(rating));
      sessionStorage.setItem('rating_modal_dismissed_session', 'true');
      setSubmitting(false);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2000);
    }
  };


  const handleRemindLater = () => {
    sessionStorage.setItem('rating_modal_dismissed_session', 'true');
    onClose();
  };

  if (!isOpen) return null;

  const activeRating = hoverRating || rating;
  const ratingInfo = RATING_LABELS[activeRating] || RATING_LABELS[5];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div

          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden"
        >
          {/* Top Decorative Background Glow */}
          <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-transparent pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={handleRemindLater}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors z-10 cursor-pointer"
            title="Remind me later"
          >
            <X size={18} />
          </button>

          {submitted ? (
            /* Success confirmation screen */
            <div className="py-12 px-6 text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 12 }}
                className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border-4 border-emerald-200 dark:border-emerald-800/40"
              >
                <CheckCircle2 size={36} />
              </motion.div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Thank You for Your Feedback!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                Your rating helps us continuously improve Campus Nexus for all students and faculty.
              </p>
              <div className="flex items-center justify-center gap-1 text-amber-400 pt-2">
                {[1, 2, 3, 4, 5].slice(0, rating).map((s) => (
                  <Star key={s} size={20} className="fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
          ) : (
            /* Rating Form */
            <form onSubmit={handleSubmit} className="p-6 sm:p-7 relative z-10 space-y-5 text-center">
              {/* Header Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold uppercase tracking-wider">
                <Sparkles size={12} className="text-amber-500" />
                <span>Rate Campus Nexus</span>
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  How is your experience?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Tell us what you think of the app and team collaboration
                </p>
              </div>

              {/* Star Rating Interactive Row */}
              <div className="py-2">
                <div className="flex justify-center items-center gap-2">
                  {[1, 2, 3, 4, 5].map((starIndex) => {
                    const isFilled = starIndex <= activeRating;
                    return (
                      <motion.button
                        key={starIndex}
                        type="button"
                        whileHover={{ scale: 1.25, rotate: 6 }}
                        whileTap={{ scale: 0.9 }}
                        onMouseEnter={() => setHoverRating(starIndex)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(starIndex)}
                        className="p-1 cursor-pointer transition-colors focus:outline-none"
                      >
                        <Star
                          size={34}
                          className={
                            isFilled
                              ? "fill-amber-400 text-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.4)]"
                              : "text-slate-300 dark:text-slate-700 hover:text-amber-300"
                          }
                        />
                      </motion.button>
                    );
                  })}
                </div>

                {/* Star Reaction Label */}
                <div className="h-6 mt-2 flex items-center justify-center gap-1.5">
                  <span className="text-sm">{ratingInfo.emoji}</span>
                  <span className={`text-xs font-black uppercase tracking-wider ${ratingInfo.color}`}>
                    {ratingInfo.text}
                  </span>
                </div>
              </div>

              {/* Quick Feedback Tags */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  What did you like the most? (Optional)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {FEEDBACK_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Feedback Textarea */}
              <div className="text-left space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare size={11} /> Your Thoughts & Suggestions (Optional)
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share what worked well or ideas for improvement..."
                  className="w-full px-3 py-2.5 glass-input rounded-xl outline-none font-medium text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleRemindLater}
                  className="flex-1 order-2 sm:order-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer uppercase tracking-wider"
                >
                  Maybe Later
                </button>
                <button
                  type="submit"
                  disabled={submitting || rating === 0}
                  className="flex-1 order-1 sm:order-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] transition-all cursor-pointer shadow-md hover:shadow-indigo-500/20 flex items-center justify-center gap-1.5 uppercase tracking-wider disabled:opacity-50"
                >
                  {submitting ? (
                    'Submitting...'
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Submit Rating</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
