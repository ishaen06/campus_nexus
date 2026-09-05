import { useState, useEffect } from 'react';
import api from '../api';
import { motion } from 'framer-motion';
import { FolderGit, Sparkles, X, UploadCloud, FileText, MessageSquare, Search, ChevronDown, AlertTriangle, Check } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import EvaluationFormModal from '../components/EvaluationFormModal';
import { THEME_SUBTOPICS, FIRST_YEAR_THEMES, CLUSTER_THEMES_YEAR_2, CLUSTER_THEMES_YEAR_3, getYearOfStudy, getClusterForBranch } from './MyTeam';

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
  student_evaluations?: Record<string, any>;
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
  const [evalModalLoading, setEvalModalLoading] = useState(false);
  const [latestTeamForModal, setLatestTeamForModal] = useState<any>(null);

  // Searchable Mentor Dropdown States
  const [registeredMentors, setRegisteredMentors] = useState<any[]>([]);
  const [mentorSearchQuery, setMentorSearchQuery] = useState('');
  const [showMentorDropdown, setShowMentorDropdown] = useState(false);
  const [mentorValidationError, setMentorValidationError] = useState<string | null>(null);
  const [dynamicClusterThemes, setDynamicClusterThemes] = useState<Record<string, string[]> | null>(null);
  const [dynamicFirstYearThemes, setDynamicFirstYearThemes] = useState<string[] | null>(null);
  const [dynamicYear3ClusterThemes, setDynamicYear3ClusterThemes] = useState<Record<string, string[]> | null>(null);

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const groupRes = await api.get('/chat/groups');
      const freshGroups = groupRes.data;
      setGroups(freshGroups);
      if (freshGroups && freshGroups.length > 0) {
        setLatestTeamForModal(freshGroups[0]);
      }
      
      const meRes = await api.get('/users/me');
      setCurrentUser(meRes.data);

      const mentorRes = await api.get('/users/mentors');
      setRegisteredMentors(mentorRes.data || []);

      api.get('/users/cohort-settings').then(res => {
        if (res.data?.first_year_themes) setDynamicFirstYearThemes(res.data.first_year_themes);
        if (res.data?.cluster_themes) setDynamicClusterThemes(res.data.cluster_themes);
        if (res.data?.year3_cluster_themes) setDynamicYear3ClusterThemes(res.data.year3_cluster_themes);
      }).catch(() => {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch latest team data from server and open the evaluation modal
  const openEvalModal = async () => {
    setEvalModalLoading(true);
    try {
      const groupRes = await api.get('/chat/groups');
      const freshGroups = groupRes.data;
      setGroups(freshGroups);
      if (freshGroups && freshGroups.length > 0) {
        setLatestTeamForModal(freshGroups[0]);
      }
    } catch (err) {
      console.error('Failed to refresh team data', err);
    } finally {
      setEvalModalLoading(false);
      setEvalModalOpen(true);
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
      if (team.mentor_name || team.mentor_email) {
        setMentorSearchQuery(`${team.mentor_name || ''} (${team.mentor_email || ''})`.trim());
      }
    }
  }, [groups]);

  const handleUpdateProjectDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setMentorValidationError(null);

    const cleanEmail = mentorEmailInput.trim().toLowerCase();
    const cleanName = mentorNameInput.trim();

    // If mentor email is provided, validate it
    if (cleanEmail) {
      if (!cleanEmail.endsWith('@gmail.com')) {
        const err = 'Mentor email must end with @gmail.com';
        setMentorValidationError(err);
        alert(err);
        return;
      }
      if (registeredMentors.length > 0) {
        const found = registeredMentors.find(m => (m.email || '').toLowerCase() === cleanEmail);
        if (!found) {
          const err = `Invalid mentor email "${mentorEmailInput}". No registered mentor found with this email. Please search and select an available mentor from the dropdown list.`;
          setMentorValidationError(err);
          alert(err);
          return;
        }
      }
    }

    try {
      const res = await api.put(`/chat/groups/${groups[0].id}/project-details`, {
        project_topic: topicInput,
        project_sub_topic: subTopicInput,
        project_theme: projectThemeInput,
        mentor_name: cleanName || null,
        mentor_email: cleanEmail || null
      });
      const updatedGroups = [...groups];
      updatedGroups[0] = res.data;
      setGroups(updatedGroups);
      alert('Project details updated successfully!');
    } catch (err: any) {
      const detailMsg = err.response?.data?.detail || 'Failed to update project details';
      setMentorValidationError(detailMsg);
      alert(detailMsg);
    }
  };

  const handleRequestApproval = async () => {
    setMentorValidationError(null);

    const cleanEmail = mentorEmailInput.trim().toLowerCase();
    const cleanName = mentorNameInput.trim();

    if (!cleanName || !cleanEmail) {
      const err = "Mentor Name and Mentor Email are required before requesting approval. Please select a mentor from the dropdown and save details first.";
      setMentorValidationError(err);
      alert(err);
      return;
    }

    if (!cleanEmail.endsWith('@gmail.com')) {
      const err = "Mentor email must end with @gmail.com";
      setMentorValidationError(err);
      alert(err);
      return;
    }

    if (registeredMentors.length > 0) {
      const found = registeredMentors.find(m => (m.email || '').toLowerCase() === cleanEmail);
      if (!found) {
        const err = `Invalid mentor email "${mentorEmailInput}". Selected mentor is not registered in the system. Please search and select a valid mentor from the dropdown.`;
        setMentorValidationError(err);
        alert(err);
        return;
      }
    }

    if (!confirm('Are you sure you want to submit your team details to the mentor for approval?')) return;
    try {
      await api.post(`/chat/groups/${groups[0].id}/submit-approval`);
      alert('Approval request sent to mentor email!');
      fetchData();
    } catch (err: any) {
      const detailMsg = err.response?.data?.detail || 'Failed to request mentor approval';
      setMentorValidationError(detailMsg);
      alert(detailMsg);
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
    <div className="w-full max-w-[95%] xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto py-12 px-4 md:px-8">
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
                      {(() => {
                        const myEval2 = currentUser
                          ? ((team.student_evaluations || {})[String(currentUser.id)] || {})
                          : {};
                        const s1 = myEval2.phase1_detail_marks
                          ? Object.values(myEval2.phase1_detail_marks as Record<string,number>).reduce((a: number, b: any) => a + Number(b || 0), 0)
                          : (team.phase1_marks || 0);
                        const s2 = myEval2.phase2_detail_marks
                          ? Object.values(myEval2.phase2_detail_marks as Record<string,number>).reduce((a: number, b: any) => a + Number(b || 0), 0)
                          : (team.phase2_marks || 0);
                        const s3 = myEval2.phase3_detail_marks
                          ? Object.values(myEval2.phase3_detail_marks as Record<string,number>).reduce((a: number, b: any) => a + Number(b || 0), 0)
                          : (team.phase3_marks || 0);
                        return (
                          <>
                            <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                              <span>My Total Score:</span>
                              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">{s1 + s2 + s3} / 140</span>
                            </div>
                            <div className="h-px bg-slate-200 dark:bg-slate-800" />
                            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              <div>
                                <span className="block text-slate-400 mb-0.5">Phase 1</span>
                                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">{s1} / 40</span>
                              </div>
                              <div>
                                <span className="block text-slate-400 mb-0.5">Phase 2</span>
                                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">{s2} / 50</span>
                              </div>
                              <div>
                                <span className="block text-slate-400 mb-0.5">Phase 3</span>
                                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">{s3} / 50</span>
                              </div>
                            </div>
                          </>
                        );
                      })()}

                      <button
                        onClick={openEvalModal}
                        disabled={evalModalLoading}
                        className="mt-2 w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/15 cursor-pointer disabled:cursor-wait uppercase tracking-wider"
                      >
                        <FileText size={15} />
                        {evalModalLoading ? 'Loading...' : 'Open Evaluation Book (View Marks)'}
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
                          {(() => {
                            const students = (team.members || []).filter((m: any) => !m.is_mentor);
                            let displayedThemes: string[] = [];
                            let clusterLabel = '';
                            if (students.length > 0) {
                              const yr = getYearOfStudy(students[0]?.joining_year, students[0]?.email, students[0]?.usn);
                              const cluster = getClusterForBranch(students[0]?.branch_code || students[0]?.branch || '');
                              if (yr === 1) {
                                displayedThemes = dynamicFirstYearThemes || FIRST_YEAR_THEMES;
                                clusterLabel = '1st Year Multidisciplinary';
                              } else if (yr === 2) {
                                displayedThemes = cluster
                                  ? ((dynamicClusterThemes && dynamicClusterThemes[cluster]) || CLUSTER_THEMES_YEAR_2[cluster] || [])
                                  : [];
                                clusterLabel = cluster ? `Year 2 • ${cluster} Cluster` : 'Year 2';
                              } else if (yr === 3) {
                                displayedThemes = cluster
                                  ? ((dynamicYear3ClusterThemes && dynamicYear3ClusterThemes[cluster]) || CLUSTER_THEMES_YEAR_3[cluster] || [])
                                  : [];
                                clusterLabel = cluster ? `Year 3 • ${cluster} Cluster` : 'Year 3';
                              } else {
                                displayedThemes = cluster
                                  ? ((dynamicClusterThemes && dynamicClusterThemes[cluster]) || CLUSTER_THEMES_YEAR_2[cluster] || [])
                                  : [];
                                clusterLabel = cluster ? `${cluster} Cluster` : '';
                              }
                            } else {
                              displayedThemes = dynamicFirstYearThemes || FIRST_YEAR_THEMES;
                            }

                            return (
                              <>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                                  Project Theme
                                  {clusterLabel && (
                                    <span className="text-indigo-500 normal-case font-semibold text-[9px]">({clusterLabel})</span>
                                  )}
                                </label>
                                <select
                                  required
                                  disabled={team.mentor_status === 'APPROVED'}
                                  className="w-full px-4 py-2.5 glass-input rounded-xl outline-none font-semibold text-xs disabled:opacity-75 bg-white dark:bg-slate-900"
                                  value={projectThemeInput}
                                  onChange={e => {
                                    setProjectThemeInput(e.target.value);
                                    setSubTopicInput('');
                                  }}
                                >
                                  <option value="">-- Select a Theme --</option>
                                  {displayedThemes.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                              </>
                            );
                          })()}
                        </div>

                        {/* Sub-Topic Selection (if available for selected theme, e.g. 1st Year) */}
                        {THEME_SUBTOPICS[projectThemeInput] && THEME_SUBTOPICS[projectThemeInput].length > 0 && (
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                              Project Sub-Topic (Optional)
                            </label>
                            <select
                              disabled={team.mentor_status === 'APPROVED'}
                              className="w-full px-4 py-2.5 glass-input rounded-xl outline-none font-semibold text-xs disabled:opacity-75 bg-white dark:bg-slate-900"
                              value={subTopicInput}
                              onChange={e => setSubTopicInput(e.target.value)}
                            >
                              <option value="">-- Select a Sub-Topic (Optional) --</option>
                              {THEME_SUBTOPICS[projectThemeInput].map(st => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </div>
                        )}




                        {/* Searchable Registered Mentor Combobox */}
                        <div className="relative">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            <span>Search & Select Available Mentor</span>
                            {registeredMentors.length > 0 && (
                              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold lowercase">
                                {registeredMentors.length} registered mentors
                              </span>
                            )}
                          </label>

                          <div className="relative">
                            <Search size={14} className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none" />
                            <input
                              type="text"
                              placeholder="Type to search mentor by name, email, or department..."
                              disabled={team.mentor_status === 'APPROVED'}
                              className="w-full pl-9 pr-8 py-2.5 glass-input rounded-xl outline-none font-semibold text-xs disabled:opacity-75 focus:ring-2 focus:ring-indigo-500/20"
                              value={mentorSearchQuery}
                              onFocus={() => setShowMentorDropdown(true)}
                              onChange={(e) => {
                                setMentorSearchQuery(e.target.value);
                                setShowMentorDropdown(true);
                                setMentorValidationError(null);
                              }}
                            />
                            <ChevronDown size={14} className="absolute right-3.5 top-3.5 text-gray-400 pointer-events-none" />
                          </div>

                          {/* Dropdown Menu */}
                          {showMentorDropdown && team.mentor_status !== 'APPROVED' && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setShowMentorDropdown(false)} />
                              <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 space-y-1">
                                {registeredMentors.filter(m => {
                                  const q = mentorSearchQuery.toLowerCase().trim();
                                  if (!q) return true;
                                  return (
                                    (m.full_name || '').toLowerCase().includes(q) ||
                                    (m.email || '').toLowerCase().includes(q) ||
                                    (m.department || '').toLowerCase().includes(q)
                                  );
                                }).length === 0 ? (
                                  <div className="px-4 py-3 text-xs text-slate-500 text-center font-medium">
                                    No registered mentor found matching "{mentorSearchQuery}"
                                  </div>
                                ) : (
                                  registeredMentors
                                    .filter(m => {
                                      const q = mentorSearchQuery.toLowerCase().trim();
                                      if (!q) return true;
                                      return (
                                        (m.full_name || '').toLowerCase().includes(q) ||
                                        (m.email || '').toLowerCase().includes(q) ||
                                        (m.department || '').toLowerCase().includes(q)
                                      );
                                    })
                                    .map(m => (
                                      <div
                                        key={m.id || m.email}
                                        onClick={() => {
                                          setMentorNameInput(m.full_name);
                                          setMentorEmailInput(m.email);
                                          setMentorSearchQuery(`${m.full_name} (${m.email})`);
                                          setShowMentorDropdown(false);
                                          setMentorValidationError(null);
                                        }}
                                        className="w-full text-left px-3.5 py-2.5 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors flex items-center justify-between group"
                                      >
                                        <div>
                                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                            {m.full_name}
                                          </div>
                                          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                            {m.email} {m.department ? `• ${m.department}` : ''}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-md ${
                                            m.is_available ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                          }`}>
                                            {m.active_teams_count}/25 Teams
                                          </span>
                                        </div>
                                      </div>
                                    ))
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mentor Name</label>
                            <span className="text-[9px] text-slate-400 font-normal lowercase">(optional until approval)</span>
                          </div>
                          <input
                            type="text"
                            placeholder="Selected mentor name (optional)"
                            disabled={team.mentor_status === 'APPROVED'}
                            className="w-full px-4 py-2.5 glass-input rounded-xl outline-none font-semibold text-xs disabled:opacity-75"
                            value={mentorNameInput}
                            onChange={e => {
                              setMentorNameInput(e.target.value);
                              setMentorValidationError(null);
                            }}
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mentor Email</label>
                            <span className="text-[9px] text-slate-400 font-normal lowercase">(optional until approval)</span>
                          </div>
                          <input
                            type="email"
                            placeholder="Selected mentor email (optional)"
                            disabled={team.mentor_status === 'APPROVED'}
                            className="w-full px-4 py-2.5 glass-input rounded-xl outline-none font-semibold text-xs disabled:opacity-75"
                            value={mentorEmailInput}
                            onChange={e => {
                              setMentorEmailInput(e.target.value);
                              setMentorValidationError(null);
                            }}
                          />
                        </div>

                        {(mentorNameInput || mentorEmailInput) && team.mentor_status !== 'APPROVED' && (
                          <div className="text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setMentorNameInput('');
                                setMentorEmailInput('');
                                setMentorSearchQuery('');
                                setMentorValidationError(null);
                              }}
                              className="text-[10px] font-semibold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              ✕ Clear Mentor Selection
                            </button>
                          </div>
                        )}

                        {mentorValidationError && (
                          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-start gap-2">
                            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-500" />
                            <div>{mentorValidationError}</div>
                          </div>
                        )}

                        {/* Team Criteria Status Notice */}
                        <div className={`p-4 rounded-2xl border text-left ${
                          team.criteria_met
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                            : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40'
                        }`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                              team.criteria_met
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-amber-700 dark:text-amber-400'
                            }`}>
                              {team.criteria_met ? (
                                <><Check size={14} className="stroke-[3]" /> Team Criteria Fulfilled</>
                              ) : (
                                <><AlertTriangle size={14} /> Team Criteria Incomplete</>
                              )}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                              {(team.members || []).filter((m: any) => !m.is_mentor).length} / 5 Members
                            </span>
                          </div>
                          {team.validation_error && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line mt-1 font-medium leading-relaxed">
                              {team.validation_error}
                            </p>
                          )}
                          {team.criteria_met && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                              Your team fulfills all cluster and branch composition requirements and is ready for mentor submission!
                            </p>
                          )}
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
                team={latestTeamForModal || team}
                isMentor={false}
                onSaveSuccess={(updatedTeam) => {
                  const updatedGroups = [...groups];
                  updatedGroups[0] = updatedTeam;
                  setGroups(updatedGroups);
                  setLatestTeamForModal(updatedTeam);
                }}
                initialStudentId={currentUser?.id ?? null}
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
