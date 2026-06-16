import { useState, useEffect } from 'react';
import api from '../api';
import { motion } from 'framer-motion';
import { 
  Users, 
  FolderGit, 
  ArrowLeft, 
  Download, 
  Award, 
  MessageSquare,
  FileText
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Avatar from '../components/Avatar';

interface FileItem {
  id: string;
  name: string;
  url: string;
  size: number;
  uploaded_by: string;
}

interface MemberItem {
  id: number;
  full_name: string;
  email: string;
  usn?: string | null;
  branch?: string | null;
  cycle?: string | null;
  avatar_config?: any;
}

interface TeamItem {
  id: number;
  name: string;
  created_by: number;
  created_at: string;
  project_topic?: string | null;
  mentor_name?: string | null;
  mentor_email?: string | null;
  mentor_status?: string;
  phase1_marks: number;
  phase2_marks: number;
  phase3_marks: number;
  project_files?: FileItem[];
  members: MemberItem[];
}

export default function TeamDetails() {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<TeamItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Marks inputs
  const [phase1Input, setPhase1Input] = useState('0');
  const [phase2Input, setPhase2Input] = useState('0');
  const [phase3Input, setPhase3Input] = useState('0');
  const [savingMarks, setSavingMarks] = useState(false);

  const navigate = useNavigate();

  const fetchTeamDetails = async () => {
    try {
      const res = await api.get('/chat/groups/mentor/teams');
      const found = res.data.find((t: any) => t.id === Number(teamId) && t.mentor_status === 'APPROVED');
      if (found) {
        setTeam(found);
        setPhase1Input(found.phase1_marks?.toString() || '0');
        setPhase2Input(found.phase2_marks?.toString() || '0');
        setPhase3Input(found.phase3_marks?.toString() || '0');
      } else {
        alert('Team not found or you are not authorized to view this team.');
        navigate('/my-teams');
      }
    } catch (err) {
      console.error("Error fetching team details:", err);
      navigate('/my-teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamDetails();
  }, [teamId]);

  const handleSaveMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;

    setSavingMarks(true);
    try {
      const p1 = parseInt(phase1Input) || 0;
      const p2 = parseInt(phase2Input) || 0;
      const p3 = parseInt(phase3Input) || 0;

      if (p1 < 0 || p1 > 150 || p2 < 0 || p2 > 150 || p3 < 0 || p3 > 150) {
        alert("Grades must be between 0 and 150.");
        setSavingMarks(false);
        return;
      }

      await api.put(`/chat/groups/${team.id}/marks`, {
        phase1_marks: p1,
        phase2_marks: p2,
        phase3_marks: p3
      });
      
      alert('Grades saved successfully!');
      fetchTeamDetails();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update grades');
    } finally {
      setSavingMarks(false);
    }
  };

  const handleChatWithAdmin = async (adminId: number) => {
    try {
      const res = await api.post('/connections/admin-chat', { receiver_id: adminId });
      const connectionId = res.data.id;
      navigate(`/chat/${connectionId}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to initialize chat session');
    }
  };

  if (loading) {
    return (
      <div className="pt-20 text-center flex flex-col items-center h-screen justify-center pb-32">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium tracking-wide">Loading Team Details...</p>
      </div>
    );
  }

  if (!team) return null;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 md:px-8 pb-24">
      {/* Back Button */}
      <button
        onClick={() => navigate('/my-teams')}
        className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft size={16} /> Back to My Teams
      </button>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 sm:p-8 space-y-8 text-left"
      >
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800/40 pb-5">
          <div>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-0.5">Team Registry Profile</span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight capitalize">{team.name}</h2>
          </div>
          
          <button
            type="button"
            onClick={() => handleChatWithAdmin(team.created_by)}
            className="bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer w-full sm:w-auto justify-center"
          >
            <MessageSquare size={14} /> Chat with Admin
          </button>
        </div>

        {/* Project Topic Callout Box */}
        <div className="bg-slate-50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800/40 rounded-xl p-5 text-left">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Project Topic</span>
          <div className="flex items-center gap-3">
            <FolderGit className="text-indigo-600 dark:text-indigo-400 w-6 h-6 shrink-0" />
            <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 capitalize">
              {team.project_topic ? team.project_topic : "No topic entered yet"}
            </p>
          </div>
        </div>

        {/* Team Members List */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Users size={15} className="text-indigo-400" /> Team Members ({team.members.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
            {team.members.map((member) => {
              const isAdmin = member.id === team.created_by;
              return (
                <div key={member.id} className="py-4.5 flex gap-4 items-center border-b border-slate-100 dark:border-slate-800/40">
                  <Avatar config={member.avatar_config || { emoji: '👨‍💻', bg: 0 }} name={member.full_name} size={40} />
                  <div className="min-w-0 flex-1 text-left">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {member.full_name}
                      {isAdmin && (
                        <span className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300 text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">Admin</span>
                      )}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase">
                        {member.usn || 'No USN'}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        {member.branch ? member.branch.toUpperCase() : 'N/A'}
                      </span>
                      {member.cycle && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                          <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                            member.cycle.toUpperCase() === 'P' 
                              ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300' 
                              : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                          }`}>
                            {member.cycle.toUpperCase()}-Cycle
                          </span>
                        </>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 block mt-1">{member.email}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Document Repository */}
        <div className="space-y-4 border-t border-slate-100 dark:border-slate-800/40 pt-6">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <FolderGit size={15} className="text-indigo-400" /> Project Documents & Files
          </h3>
          {(!team.project_files || team.project_files.length === 0) ? (
            <p className="text-xs text-slate-400 italic py-4">
              No files uploaded by the team yet. Student admins can upload project documents from their project dashboard.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/40">
              {team.project_files.map((file) => {
                const sizeStr = file.size > 1024 * 1024 
                  ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                  : `${(file.size / 1024).toFixed(1)} KB`;
                  
                const downloadUrl = api.defaults.baseURL ? `${api.defaults.baseURL.replace('/api', '')}${file.url}` : file.url;
                
                return (
                  <div key={file.id} className="py-3.5 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-900/10 transition-all">
                    <div className="min-w-0 flex-1 flex items-center gap-3">
                      <FileText className="text-indigo-600 dark:text-indigo-400 w-5 h-5 shrink-0" />
                      <div className="min-w-0">
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-slate-900 dark:text-white truncate block hover:underline hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          {file.name}
                        </a>
                        <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                          {sizeStr} • By {file.uploaded_by}
                        </span>
                      </div>
                    </div>
                    <a
                      href={downloadUrl}
                      download
                      className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition shrink-0 ml-3"
                      title="Download File"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Phase Grading Section */}
        <div className="space-y-4 border-t border-slate-100 dark:border-slate-800/40 pt-6">
          <div className="flex items-center gap-2">
            <Award size={16} className="text-indigo-600" />
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phase Grades Evaluation</h3>
          </div>
          
          <form onSubmit={handleSaveMarks} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex flex-col text-left">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Phase 1 Marks</label>
                <input
                  type="number"
                  min="0"
                  max="150"
                  className="w-full glass-input px-4 py-2.5 rounded-xl outline-none text-sm font-bold text-center text-indigo-600 dark:text-indigo-400"
                  value={phase1Input}
                  onChange={e => setPhase1Input(e.target.value)}
                />
              </div>
              <div className="flex flex-col text-left">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Phase 2 Marks</label>
                <input
                  type="number"
                  min="0"
                  max="150"
                  className="w-full glass-input px-4 py-2.5 rounded-xl outline-none text-sm font-bold text-center text-indigo-600 dark:text-indigo-400"
                  value={phase2Input}
                  onChange={e => setPhase2Input(e.target.value)}
                />
              </div>
              <div className="flex flex-col text-left">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Phase 3 Marks</label>
                <input
                  type="number"
                  min="0"
                  max="150"
                  className="w-full glass-input px-4 py-2.5 rounded-xl outline-none text-sm font-bold text-center text-indigo-600 dark:text-indigo-400"
                  value={phase3Input}
                  onChange={e => setPhase3Input(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingMarks}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-75 text-white font-semibold py-3 px-8 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer uppercase tracking-wider"
              >
                {savingMarks ? "Saving..." : "Save Grades"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
