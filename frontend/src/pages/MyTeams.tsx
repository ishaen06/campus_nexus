import { useState, useEffect } from 'react';
import api from '../api';
import { motion } from 'framer-motion';
import { Users, Search, FolderGit, Calendar, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';

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
  mentor_status?: string;
  members: MemberItem[];
}

export default function MyTeams() {
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/chat/groups/mentor/teams')
      .then(res => {
        // Only keep approved teams
        const approved = res.data.filter((t: any) => t.mentor_status === 'APPROVED');
        setTeams(approved);
      })
      .catch(err => {
        console.error("Error fetching approved teams:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const filteredTeams = teams.filter(t => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const nameMatch = t.name.toLowerCase().includes(query);
    const topicMatch = t.project_topic?.toLowerCase().includes(query) || false;
    const memberMatch = t.members.some(m => m.full_name.toLowerCase().includes(query));
    return nameMatch || topicMatch || memberMatch;
  });

  if (loading) {
    return (
      <div className="pt-20 text-center flex flex-col items-center h-screen justify-center pb-32">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium tracking-wide">Loading My Teams...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 md:px-8 pb-24">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <Users className="text-indigo-600 w-9 h-9" /> My Teams
        </h1>
        <p className="text-gray-500 font-medium mt-1">Review active group registries, files, and project progress evaluations</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by team name, topic, or member..."
            className="w-full pl-9 pr-4 py-2.5 glass-input rounded-xl text-xs outline-none font-semibold text-slate-100"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="text-xs font-bold text-slate-400 bg-slate-900/10 dark:bg-slate-950/40 px-4 py-2.5 rounded-xl border border-white/5 shadow-sm shrink-0">
          Total Assigned: <span className="text-indigo-600 dark:text-indigo-400 font-black">{teams.length} / 25</span>
        </div>
      </div>

      {/* Teams Grid */}
      {filteredTeams.length === 0 ? (
        <div className="glass-panel p-12 text-center max-w-xl mx-auto flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-slate-900/10 dark:bg-slate-950/40 flex items-center justify-center text-slate-500 border border-white/5 mb-6">
            <Users size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-950 dark:text-white tracking-tight">No Active Teams</h3>
          <p className="text-slate-500 text-xs font-medium mt-1.5 max-w-sm leading-relaxed">
            You do not have any approved teams under your supervision yet. Go to the approvals tab to review pending submissions.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredTeams.map((team) => (
            <motion.div
              whileHover={{ x: 4 }}
              key={team.id}
              onClick={() => navigate(`/my-teams/${team.id}`)}
              className="glass-panel p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 cursor-pointer relative overflow-hidden group shadow-md transition-all rounded-2xl text-left"
            >
              {/* Left section: Team Name and Project Topic */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-400 transition-colors capitalize">
                  Topic: {team.project_topic || 'Not Specified'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1 truncate">
                  Team: <span className="text-slate-600 dark:text-slate-200">{team.name}</span>
                </p>
              </div>

              {/* Middle section: Member Avatars */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Roster:</span>
                <div className="flex -space-x-2.5">
                  {team.members.map((m) => (
                    <div 
                      key={m.id} 
                      className="relative hover:scale-110 hover:z-30 transition-transform"
                      title={m.full_name}
                    >
                      <Avatar 
                        config={m.avatar_config || { emoji: '👨‍💻', bg: 0 }} 
                        name={m.full_name} 
                        size={32} 
                        className="ring-2 ring-white dark:ring-slate-950 shadow-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right section: Metadata & Navigation Arrow */}
              <div className="flex items-center gap-6 text-[10px] text-gray-500 font-bold border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 md:pl-6 shrink-0 justify-between">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1.5">
                    <FolderGit size={14} className="text-indigo-400" /> {team.members.length} members
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-indigo-400" /> {new Date(team.created_at).toLocaleDateString()}
                  </span>
                </div>
                <ArrowRight size={16} className="text-slate-400 group-hover:text-indigo-400 group-hover:translate-x-1.5 transition-all" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
