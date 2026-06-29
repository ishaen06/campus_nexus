import { useState, useEffect } from 'react';
import api from '../api';
import { motion } from 'framer-motion';
import { FolderGit, Sparkles, X, UploadCloud, FileText, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EvaluationFormModal from '../components/EvaluationFormModal';
import { THEME_SUBTOPICS } from './MyTeam';

interface GroupItem {
  id: number;
  name: string;
  created_by: number;
  created_at: string;
  member_ids: number[];
  is_public: boolean;
  members: any[];
  criteria_met: boolean;
  validation_error?: string | null;
  project_topic?: string | null;
  project_sub_topic?: string | null;
  project_theme?: string | null;
  mentor_name?: string | null;
  mentor_email?: string | null;
  mentor_status?: string;
  mentor_rejection_reason?: string | null;
  phase1_marks?: number;
  phase2_marks?: number;
  phase3_marks?: number;
  project_files?: any[];
}

export default function ProjectDashboard() {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Project Dashboard States
  const [topicInput, setTopicInput] = useState('');
  const [subTopicInput, setSubTopicInput] = useState('');
  const [projectThemeInput, setProjectThemeInput] = useState('');
  const [mentorNameInput, setMentorNameInput] = useState('');
  const [mentorEmailInput, setMentorEmailInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [evalModalOpen, setEvalModalOpen] = useState(false);

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const groupRes = await api.get('/chat/groups');
      setGroups(groupRes.data);
      
      const meRes = await api.get('/users/me');
      setCurrentUser(meRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (groups.length > 0) {
      const team = groups[0];
      setTopicInput(team.project_topic || '');
      setSubTopicInput(team.project_sub_topic || '');
      setProjectThemeInput(team.project_theme || '');
      setMentorNameInput(team.mentor_name || '');
      setMentorEmailInput(team.mentor_email || '');
    }
  }, [groups]);

  const handleUpdateProjectDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.put(`/chat/groups/${groups[0].id}/project-details`, {
        project_topic: topicInput,
        project_sub_topic: subTopicInput,
        project_theme: projectThemeInput,
        mentor_name: mentorNameInput,
        mentor_email: mentorEmailInput
      });
      const updatedGroups = [...groups];
      updatedGroups[0] = res.data;
      setGroups(updatedGroups);
      alert('Project details updated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update project details');
    }
  };

  const handleRequestApproval = async () => {
    if (!confirm('Are you sure you want to submit your team details to the mentor for approval?')) return;
    try {
      await api.post(`/chat/groups/${groups[0].id}/submit-approval`);
      alert('Approval request sent to mentor email!');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to request mentor approval');
    }
  };

  const handleChatWithMentor = async (mentorEmail: string) => {
    try {
      const res = await api.post('/connections/mentor-chat', { email: mentorEmail });
      const connectionId = res.data.connection_id || res.data.id;
      navigate(`/chat/${connectionId}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Could not start chat with mentor');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    setUploading(true);
    try {
      const res = await api.post(`/chat/groups/${groups[0].id}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const updatedGroups = [...groups];
      updatedGroups[0].project_files = res.data;
      setGroups(updatedGroups);
      alert('File uploaded successfully!');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      const res = await api.delete(`/chat/groups/${groups[0].id}/files/${fileId}`);
      const updatedGroups = [...groups];
      updatedGroups[0].project_files = res.data;
      setGroups(updatedGroups);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete file');
    }
  };

  if (loading) return (
    <div className="pt-20 text-center flex flex-col items-center h-screen justify-center pb-32">
      <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mb-4"></div>
      <p className="text-gray-500 font-medium tracking-wide">Loading project dashboard...</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 md:px-8">
      {/* Header */}
      <div className="mb-8 text-left">
        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
          <FolderGit className="text-indigo-600 w-10 h-10" /> Project Dashboard
        </h1>
        <p className="text-gray-500 font-medium mt-1">Manage project resources, mentor assignment, and approval submissions</p>
      </div>

      {groups.length > 0 ? (
        (() => {
          const team = groups[0];
          const isAdmin = team.created_by === currentUser?.id;
          
          return (
            <div className="space-y-6">
              {/* Grades at the Top (Full Width when Approved) */}
              {team.mentor_status === 'APPROVED' && (
                <div className="bg-white dark:bg-[#1e1e24] border border-slate-100 dark:border-slate-800 rounded-xl p-6 text-left">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-4">Project Evaluation</span>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        🏆 Grades & Scorecard
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">Overall evaluation across project phases</p>
                    </div>
                    <div className="flex gap-4 w-full sm:w-auto">
                      <div className="flex-1 sm:w-28 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 text-center">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Phase 1</span>
                        <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                          {team.phase1_marks ?? 0}
                        </span>
                      </div>
                      <div className="flex-1 sm:w-28 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 text-center">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Phase 2</span>
                        <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                          {team.phase2_marks ?? 0}
                        </span>
                      </div>
                      <div className="flex-1 sm:w-28 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 text-center">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Phase 3</span>
                        <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                          {team.phase3_marks ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-3">
                {/* Left Column: File Management (Main) - md:col-span-2 */}
                <div className="md:col-span-2 space-y-6">
                  <div className="glass-panel p-6 flex flex-col justify-between">
                    <div className="text-left">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-1">Project Documents & Repository</span>
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">File Management</h2>
                        </div>
                      </div>

                      {/* File upload action */}
                      <div className="border border-dashed border-slate-300 dark:border-slate-800/80 rounded-xl p-6 text-center mb-6 bg-slate-50/50 dark:bg-slate-950/10 hover:bg-slate-50 dark:hover:bg-slate-950/20 transition-all">
                        <input
                          type="file"
                          id="file-upload"
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={uploading}
                        />
                        <label htmlFor="file-upload" className="cursor-pointer block">
                          <UploadCloud className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
                          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 block hover:underline">
                            {uploading ? "Uploading file..." : "Click to Upload Project Files"}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1 block">Upload project synopsis, report, source code zip, etc.</span>
                        </label>
                      </div>

                      {/* Files list */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Uploaded Files ({team.project_files?.length || 0})</h4>
                        
                        {(!team.project_files || team.project_files.length === 0) ? (
                          <p className="text-xs text-gray-400 italic py-4">No files uploaded yet.</p>
                        ) : (
                          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/80 pr-1 max-h-80 overflow-y-auto no-scrollbar">
                            {team.project_files.map((file: any) => {
                              const sizeStr = file.size > 1024 * 1024 
                                ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                                : `${(file.size / 1024).toFixed(1)} KB`;
                                
                              const downloadUrl = api.defaults.baseURL ? `${api.defaults.baseURL.replace('/api', '')}${file.url}` : file.url;

                              return (
                                <div key={file.id} className="py-3.5 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-900/10 transition-all">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <FileText className="text-indigo-600 dark:text-indigo-400 w-5 h-5 shrink-0" />
                                    <div className="min-w-0">
                                      <a
                                        href={downloadUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block hover:underline hover:text-indigo-600 dark:hover:text-indigo-400"
                                      >
                                        {file.name}
                                      </a>
                                      <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                                        {sizeStr} • By {file.uploaded_by}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 pl-2">
                                    {isAdmin && (
                                      <button
                                        onClick={() => handleDeleteFile(file.id)}
                                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                                        title="Delete File"
                                      >
                                        <X size={14} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Academic Evaluation Sheets */}
                  <div className="glass-panel p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-1">Experiential Learning Records</span>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Academic Evaluation Sheets</h2>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Access the fillable RV College of Engineering Experiential Learning Observation Record and Phase Evaluation books.</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex flex-col gap-3 p-4 bg-slate-50/50 dark:bg-slate-950/10 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
                      <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span>Total Score:</span>
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                          {(team.phase1_marks || 0) + (team.phase2_marks || 0) + (team.phase3_marks || 0)} / 140
                        </span>
                      </div>
                      <div className="h-px bg-slate-200 dark:bg-slate-800" />
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <div>
                          <span className="block text-slate-400 mb-0.5">Phase 1</span>
                          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">{team.phase1_marks || 0} / 40</span>
                        </div>
                        <div>
                          <span className="block text-slate-400 mb-0.5">Phase 2</span>
                          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">{team.phase2_marks || 0} / 50</span>
                        </div>
                        <div>
                          <span className="block text-slate-400 mb-0.5">Phase 3</span>
                          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">{team.phase3_marks || 0} / 50</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setEvalModalOpen(true)}
                        className="mt-2 w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/15 cursor-pointer uppercase tracking-wider"
                      >
                        <FileText size={15} />
                        Open Evaluation Book (Fillable Form)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Mentor Confirmation - md:col-span-1 */}
                <div className="space-y-6">
                  <div className="glass-panel p-6 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-1">Project & Mentor Settings</span>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Mentor Approval</h2>
                      </div>
                    </div>
                    
                    {/* Approval Status Badge */}
                    <div className="mb-5">
                      <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border block text-center ${
                        team.mentor_status === 'APPROVED'
                          ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/30'
                          : team.mentor_status === 'PENDING'
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/30'
                          : team.mentor_status === 'REJECTED'
                          ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/30'
                          : 'bg-slate-100 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/20'
                      }`}>
                        {team.mentor_status === 'APPROVED' ? '✓ Mentor Approved' : 
                         team.mentor_status === 'PENDING' ? '⏳ Pending Approval' :
                         team.mentor_status === 'REJECTED' ? '✗ Mentor Rejected' : '⚠️ Not Submitted'}
                      </span>
                    </div>

                    {team.mentor_status === 'REJECTED' && team.mentor_rejection_reason && (
                      <div className="mb-5 bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex gap-3 text-xs font-semibold leading-relaxed text-left">
                        <div className="text-base shrink-0">❌</div>
                        <div>
                          <span className="block font-bold uppercase tracking-wider text-[9px] mb-1">Mentor Rejection Reason</span>
                          {team.mentor_rejection_reason}
                        </div>
                      </div>
                    )}

                    {team.mentor_status === 'APPROVED' ? (
                      <div className="space-y-4 mt-2 text-left">
                        <div className="flex flex-col gap-4">
                          <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
                            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Project Title</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block capitalize">{team.project_topic}</span>
                          </div>
                          <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
                            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Project Theme</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block capitalize">{team.project_theme || 'Not Assigned'}</span>
                          </div>
                          <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
                            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Project Sub-Topic</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block capitalize">{team.project_sub_topic || 'Not Assigned'}</span>
                          </div>
                          <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
                            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Assigned Mentor</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block">{team.mentor_name}</span>
                          </div>
                          <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
                            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Mentor Email</span>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 block truncate">{team.mentor_email}</span>
                          </div>
                        </div>
                        {team.mentor_email && (
                          <button
                            type="button"
                            onClick={() => handleChatWithMentor(team.mentor_email!)}
                            className="mt-4 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all cursor-pointer uppercase tracking-wider shadow-sm hover:shadow"
                          >
                            <MessageSquare size={14} /> Chat with Mentor
                          </button>
                        )}
                      </div>
                    ) : (
                      <form onSubmit={handleUpdateProjectDetails} className="space-y-4 text-left">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Project Title</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Design of a Hybrid Dielectric Immersion..."
                            disabled={team.mentor_status === 'APPROVED'}
                            className="w-full px-4 py-2.5 glass-input rounded-xl outline-none font-semibold text-xs disabled:opacity-75"
                            value={topicInput}
                            onChange={e => setTopicInput(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Project Theme</label>
                          <select
                            required
                            disabled={team.mentor_status === 'APPROVED'}
                            className="w-full px-4 py-2.5 glass-input rounded-xl outline-none font-semibold text-xs disabled:opacity-75 bg-white dark:bg-slate-900"
                            value={projectThemeInput}
                            onChange={e => {
                              setProjectThemeInput(e.target.value);
                              setSubTopicInput(''); // Reset sub-topic on theme change
                            }}
                          >
                            <option value="">-- Select a Theme --</option>
                            {Object.keys(THEME_SUBTOPICS).map(theme => (
                              <option key={theme} value={theme}>{theme}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Project Sub-Topic</label>
                          <select
                            required
                            disabled={team.mentor_status === 'APPROVED' || !projectThemeInput}
                            className="w-full px-4 py-2.5 glass-input rounded-xl outline-none font-semibold text-xs disabled:opacity-50 bg-white dark:bg-slate-900"
                            value={subTopicInput}
                            onChange={e => setSubTopicInput(e.target.value)}
                          >
                            <option value="">
                              {projectThemeInput ? "-- Select a Sub-Topic --" : "-- Select a Theme first --"}
                            </option>
                            {projectThemeInput && THEME_SUBTOPICS[projectThemeInput]?.map(sub => (
                              <option key={sub} value={sub}>{sub}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mentor Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Dr. Ramesh Kumar"
                            disabled={team.mentor_status === 'APPROVED'}
                            className="w-full px-4 py-2.5 glass-input rounded-xl outline-none font-semibold text-xs disabled:opacity-75"
                            value={mentorNameInput}
                            onChange={e => setMentorNameInput(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mentor Email</label>
                          <input
                            type="email"
                            required
                            placeholder="e.g. mentor@gmail.com"
                            pattern=".*@gmail\.com$"
                            title="Mentor email must end with @gmail.com"
                            disabled={team.mentor_status === 'APPROVED'}
                            className="w-full px-4 py-2.5 glass-input rounded-xl outline-none font-semibold text-xs disabled:opacity-75"
                            value={mentorEmailInput}
                            onChange={e => setMentorEmailInput(e.target.value)}
                          />
                        </div>

                        {team.mentor_status !== 'APPROVED' && (
                          <div className="pt-2 flex flex-col gap-2">
                            <button
                              type="submit"
                              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-4 rounded-xl text-xs transition-all cursor-pointer uppercase tracking-wider"
                            >
                              Save Details
                            </button>
                            
                            {team.criteria_met ? (
                              <button
                                type="button"
                                onClick={handleRequestApproval}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl text-xs transition-all cursor-pointer uppercase tracking-wider"
                              >
                                Request Approval
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                title={team.validation_error || "Complete team criteria to submit"}
                                className="w-full bg-slate-400 text-white font-semibold py-3 px-4 rounded-xl text-xs opacity-50 cursor-not-allowed uppercase tracking-wider"
                              >
                                Request Approval (Rules Incomplete)
                              </button>
                            )}
                          </div>
                        )}
                      </form>
                    )}
                  </div>
                </div>
              </div>
              <EvaluationFormModal
                isOpen={evalModalOpen}
                onClose={() => setEvalModalOpen(false)}
                team={team}
                isMentor={false}
                onSaveSuccess={(updatedTeam) => {
                  const updatedGroups = [...groups];
                  updatedGroups[0] = updatedTeam;
                  setGroups(updatedGroups);
                }}
              />
            </div>
          );
        })()
      ) : (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-12 text-center max-w-xl mx-auto flex flex-col items-center"
        >
          <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/20 mb-6">
            <Sparkles size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Project Dashboard Locked</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-8 leading-relaxed">
            You need to be in an active team to access the Project Dashboard. Once you join or create a team, you will be able to enter mentor details and upload project files here.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/connections')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl text-xs shadow-md transition-all cursor-pointer uppercase tracking-wider"
            >
              Go to Connections
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
