import { useState, useEffect } from 'react';
import api from '../api';
import { motion } from 'framer-motion';
import { ShieldAlert, Calendar, User, MessageSquare, AlertOctagon } from 'lucide-react';

interface Report {
  id: number;
  reporter: { id: number; name: string } | null;
  reported: { id: number; name: string } | null;
  reason: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const res = await api.get('/admin/reports');
      setReports(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load reports. Are you an admin?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleBan = async (userId: number) => {
    if (!window.confirm("Are you sure you want to ban this user?")) return;
    
    try {
      await api.post(`/admin/ban/${userId}`);
      alert("User has been banned.");
      fetchReports();
    } catch (err: any) {
      alert("Failed to ban user");
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-panel p-8 text-center max-w-md shadow-2xl border-red-200/50 bg-red-50/10 backdrop-blur-md">
          <AlertOctagon className="text-red-500 w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 font-semibold text-sm leading-relaxed mb-6">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="pt-20 text-center flex flex-col items-center h-screen justify-center pb-32">
      <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mb-4"></div>
      <p className="text-gray-500 font-medium tracking-wide">Loading moderation center...</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 md:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <ShieldAlert className="text-red-600 w-10 h-10" /> Moderation Center
          </h1>
          <p className="text-gray-500 font-medium mt-1">Review flagged profiles, user reports, and manage campus safety bans</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={async () => {
              try {
                const res = await api.get('/admin/download-approved-teams', { responseType: 'blob' });
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'approved_teams.csv');
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
              } catch (err) {
                console.error("Failed to download teams CSV", err);
                alert("Failed to download spreadsheet.");
              }
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition shadow-lg shadow-indigo-600/10 flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
          >
            Download Teams
          </button>
          
          <button
            onClick={async () => {
              try {
                const res = await api.get('/admin/download-student-marks', { responseType: 'blob' });
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'student_phase_marks.csv');
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
              } catch (err) {
                console.error("Failed to download student marks CSV", err);
                alert("Failed to download marks spreadsheet.");
              }
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition shadow-lg shadow-emerald-600/10 flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
          >
            Download Phase 1/2/3 Marks
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {reports.map((report, index) => (
          <motion.div 
            key={report.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass-panel p-6 hover:bg-white/10 transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
          >
            {/* Report Details Card */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="bg-red-50/90 border border-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm backdrop-blur-sm flex items-center gap-1">
                  <AlertOctagon size={11} /> Flagged
                </span>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={13} /> {new Date(report.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              {/* Members Involved */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/20 p-4 rounded-2xl border border-white/30 backdrop-blur-sm">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Reporter</span>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100 text-indigo-700 font-bold text-xs">
                      <User size={12} />
                    </div>
                    <span className="text-sm font-bold text-gray-800">{report.reporter?.name || 'Unknown'}</span>
                    <span className="text-xs text-gray-400 font-semibold">(ID: {report.reporter?.id})</span>
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Reported Target</span>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center border border-red-100 text-red-600 font-bold text-xs">
                      <User size={12} />
                    </div>
                    <span className="text-sm font-extrabold text-red-600">{report.reported?.name || 'Unknown'}</span>
                    <span className="text-xs text-gray-400 font-semibold">(ID: {report.reported?.id})</span>
                  </div>
                </div>
              </div>

              {/* Reason description */}
              <div className="border-l-4 border-red-500 bg-red-50/10 p-3.5 rounded-r-2xl border border-y-red-100/10 border-r-red-100/10">
                <span className="block text-[9px] font-bold text-red-500/80 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <MessageSquare size={10} /> Violation Reason
                </span>
                <p className="text-gray-700 text-sm font-semibold leading-relaxed italic">"{report.reason}"</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center flex-shrink-0 w-full md:w-auto mt-2 md:mt-0">
              {report.reported && (
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleBan(report.reported!.id)}
                  className="w-full md:w-auto px-6 py-3 font-extrabold rounded-full bg-red-50 border border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-500 transition-all duration-300 text-sm shadow-sm cursor-pointer"
                >
                  Ban User
                </motion.button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {reports.length === 0 && (
        <div className="text-center py-16 text-gray-400 font-semibold glass-panel p-10 max-w-md mx-auto mt-10">
          <span className="text-4xl block mb-4">🛡️</span>
          No reports found. Everyone is behaving well!
        </div>
      )}
    </div>
  );
}
