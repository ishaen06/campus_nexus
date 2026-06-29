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
import EvaluationFormModal from '../components/EvaluationFormModal';

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

  const [evalModalOpen, setEvalModalOpen] = useState(false);

  const navigate = useNavigate();

  const fetchTeamDetails = async () => {
    try {
      const res = await api.get('/chat/groups/mentor/teams');
      const found = res.data.find((t: any) => t.id === Number(teamId) && t.mentor_status === 'APPROVED');
      if (found) {
        setTeam(found);
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




  if (loading) {
    return (
      <div className="pt-20 text-center flex flex-col items-center h-screen justify-center pb-32">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium tracking-wide">Loading Team Details...</p>
      </div>
    );
  }

  if (!team) return null;

  const studentMembers = (team.members || []).filter((m: any) => !m.is_mentor);

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
            onClick={() => navigate(`/chat/group/${team.id}`, { state: { groupName: team.name } })}
            className="bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer w-full sm:w-auto justify-center"
          >
            <MessageSquare size={14} /> Team Group Chat
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
            <Users size={15} className="text-indigo-400" /> Team Members ({studentMembers.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
            {studentMembers.map((member) => {
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

        {/* Phase Grading & Evaluation Book Section */}
        <div className="space-y-4 border-t border-slate-100 dark:border-slate-800/40 pt-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Award size={16} className="text-indigo-600" />
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Evaluation Book & Grades</h3>
            </div>
            <div className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
              Total: {(team.phase1_marks || 0) + (team.phase2_marks || 0) + (team.phase3_marks || 0)} / 140
            </div>
          </div>
          
          <div className="bg-slate-50/50 dark:bg-slate-950/10 p-4 border border-slate-100 dark:border-slate-800/80 rounded-2xl flex flex-col gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Open the interactive fillable form mapping the official RVCE Experiential Learning Observation Record. You can grade Phase 1, Phase 2, and Phase 3 sections, enter observations, and export a print-ready PDF book for both students and mentors.
            </p>

            {/* Scorecard cards */}
            <div className="grid grid-cols-3 gap-3 my-1">
              <div className="bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 text-center">
                <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Phase 1</span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                  {team.phase1_marks ?? 0} <span className="text-[10px] text-slate-400 font-normal">/ 40</span>
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 text-center">
                <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Phase 2</span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                  {team.phase2_marks ?? 0} <span className="text-[10px] text-slate-400 font-normal">/ 50</span>
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 text-center">
                <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Phase 3</span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                  {team.phase3_marks ?? 0} <span className="text-[10px] text-slate-400 font-normal">/ 50</span>
                </span>
              </div>
            </div>
            
            <button
              onClick={() => setEvalModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/15 cursor-pointer uppercase tracking-wider"
            >
              <FileText size={15} />
              Open / Edit Evaluation Sheets (Fillable Form)
            </button>
          </div>
        </div>

        <EvaluationFormModal
          isOpen={evalModalOpen}
          onClose={() => setEvalModalOpen(false)}
          team={team}
          isMentor={true}
          onSaveSuccess={(updatedTeam) => setTeam(updatedTeam)}
        />
      </motion.div>
    </div>
  );
}
