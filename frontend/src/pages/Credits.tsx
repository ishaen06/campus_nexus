import { motion } from 'framer-motion';
import { Sparkles, Award, Code2, Cpu, Database, GraduationCap, Heart, Mail, ShieldCheck, Terminal, Users, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Credits() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 p-4 md:p-8 lg:p-12 transition-colors">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Navigation & Header Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <span className="text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 shadow-xs">
            Platform Credits • v2.4.0
          </span>
        </div>

        {/* Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white p-8 md:p-12 shadow-2xl border border-indigo-800/40"
        >
          {/* Background Decorative Rings */}
          <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-purple-600/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-indigo-200 text-xs font-bold">
              <Sparkles size={14} className="text-amber-400" />
              Engineering Link Platform
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Campus Nexus
            </h1>

            <p className="text-sm md:text-base text-indigo-200/90 leading-relaxed font-medium">
              Architected and engineered for <strong className="text-white font-bold">RV College of Engineering (RVCE)</strong> to empower students across branches with seamless peer discovery, multidisciplinary cluster team building, real-time communications, and structured academic project evaluations.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white">
                <GraduationCap size={15} className="text-indigo-300" />
                RVCE Autonomous
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white">
                <ShieldCheck size={15} className="text-emerald-400" />
                Autonomous Project Portal
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white">
                <Users size={15} className="text-cyan-300" />
                Inter-Branch Synergy
              </span>
            </div>
          </div>
        </motion.div>

        {/* Lead Creator Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/20">
                IB
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  Lead Developer & System Architect
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                  Ishaen Bethur
                </h2>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Department of Computer Science & Engineering • RV College of Engineering
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="mailto:ishaen.vihaan@gmail.com"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 text-xs font-bold transition-colors border border-slate-200 dark:border-slate-700"
              >
                <Mail size={14} /> Contact Developer
              </a>
            </div>
          </div>

          {/* Key Contributions Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Code2 size={16} />
              </div>
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">Full-Stack Engineering</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Designed complete reactive frontend in React + TypeScript and high-throughput asynchronous REST & WebSocket APIs in FastAPI.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Cpu size={16} />
              </div>
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">Algorithm & Multidisciplinary Cluster Engine</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Engineered the intelligent cluster compatibility matcher, cohort batch normalization (26, 25, 24, 23), and dynamic team validation.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Database size={16} />
              </div>
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">Data Architecture & Security</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Implemented schema self-healing on MongoDB, SHA-256 session lockouts, auto-export datasets, and robust role-based permissions.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Technology Architecture Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Terminal size={18} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Technology Architecture</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Modern high-performance stack powering Campus Nexus</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { title: "Frontend Client", tech: "React 18 + TypeScript", detail: "Vite, Tailwind CSS, Framer Motion" },
              { title: "Backend Services", tech: "Python FastAPI", detail: "Asynchronous ASGI, Pydantic v2" },
              { title: "Database Layer", tech: "MongoDB Atlas", detail: "Dynamic collections & sequence counters" },
              { title: "Real-time Messaging", tech: "WebSockets + Polling", detail: "Peer chats, group updates & notifications" },
              { title: "Styling System", tech: "Tailwind CSS v3", detail: "Custom dark/light mode engine" },
              { title: "Security & Auth", tech: "JWT Bearer Tokens", detail: "Session timeouts & Re-auth lock overlay" },
              { title: "Analytics & Reports", tech: "Pandas & Native CSV", detail: "Cross-cohort isolation & export" },
              { title: "Email Dispatch", tech: "Resend / SMTP Relay", detail: "Targeted cohort notifications" },
            ].map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/70 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{item.title}</span>
                <p className="text-xs font-black text-slate-800 dark:text-slate-200">{item.tech}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{item.detail}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Academic Leadership & Acknowledgements */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Award size={18} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Acknowledgements & Institutional Leadership</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Recognizing the vision and support behind the platform</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/70 space-y-2">
              <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <GraduationCap size={15} className="text-indigo-600 dark:text-indigo-400" />
                RV College of Engineering (RVCE)
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                An Autonomous Institution affiliated to Visvesvaraya Technological University, Belagavi. Approved by AICTE, New Delhi. Campus Nexus serves as the primary collaborative nexus for interdisciplinary engineering students.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/70 space-y-2">
              <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users size={15} className="text-purple-600 dark:text-purple-400" />
                Faculty Mentors & Project Coordinators
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Special gratitude to the faculty members, departmental coordinators, and student evaluators across CSE, AIML, CY, DS, ECE, EEE, and core engineering branches who provided feedback, rubric requirements, and validation.
              </p>
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span>Made with</span>
              <Heart size={14} className="text-rose-500 fill-rose-500" />
              <span>by Ishaen Bethur for RVCE</span>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold">
              <Link to="/feedback" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                Submit App Feedback →
              </Link>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
