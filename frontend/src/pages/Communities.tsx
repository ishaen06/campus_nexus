import { useState, useEffect } from 'react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Tag, FileText, Globe } from 'lucide-react';

interface Community {
  id: number;
  name: string;
  description: string;
  category: string;
}

export default function Communities() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', category: '' });
  const [loading, setLoading] = useState(true);

  const fetchCommunities = async () => {
    try {
      const res = await api.get('/communities/');
      setCommunities(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/communities/', formData);
      setShowCreate(false);
      setFormData({ name: '', description: '', category: '' });
      fetchCommunities();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create community");
    }
  };

  const handleJoin = async (id: number) => {
    try {
      await api.post(`/communities/${id}/join`);
      alert("Successfully joined!");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to join community");
    }
  };

  if (loading) return (
    <div className="pt-20 text-center flex flex-col items-center h-screen justify-center pb-32">
      <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mb-4"></div>
      <p className="text-gray-500 font-medium tracking-wide">Loading communities...</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 md:px-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Communities</h1>
          <p className="text-gray-500 font-medium mt-1">Discover student-led clubs, groups, and academic hubs</p>
        </div>
        
        <button 
          onClick={() => setShowCreate(!showCreate)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-full font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
        >
          {showCreate ? "Cancel" : (
            <>
              <Plus size={18} /> New Community
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-panel p-6 mb-8 overflow-hidden"
          >
            <h2 className="text-xl font-black mb-4 text-gray-900 flex items-center gap-2">
              <Globe className="text-indigo-500" size={20} /> Start a new Community
            </h2>
            
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                  <Users size={14} className="text-gray-400" /> Name
                </label>
                <input 
                  type="text" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. ACM Student Chapter"
                  className="mt-1 block w-full rounded-2xl glass-input p-3.5 outline-none font-medium" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                  <Tag size={14} className="text-gray-400" /> Category
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Technology, Sports, Arts" 
                  required 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})} 
                  className="mt-1 block w-full rounded-2xl glass-input p-3.5 outline-none font-medium" 
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                  <FileText size={14} className="text-gray-400" /> Description
                </label>
                <textarea 
                  required 
                  rows={3}
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Tell us what this community is about..."
                  className="mt-1 block w-full rounded-2xl glass-input p-3.5 outline-none resize-none font-medium" 
                />
              </div>
              
              <div className="md:col-span-2">
                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit" 
                  className="bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-bold shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer w-full md:w-auto"
                >
                  Create & Launch
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {communities.map((comm, index) => (
          <motion.div 
            key={comm.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass-panel p-6 flex flex-col justify-between hover:bg-white/10 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
          >
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="px-3 py-1 bg-indigo-50/80 text-indigo-700 border border-indigo-100 text-[10px] font-extrabold rounded-full shadow-sm uppercase tracking-wider backdrop-blur-sm">
                  {comm.category}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors duration-200 mt-2">{comm.name}</h3>
              <p className="text-gray-600 text-sm mt-3 mb-6 line-clamp-3 leading-relaxed font-medium">{comm.description}</p>
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleJoin(comm.id)}
              className="w-full py-2.5 font-bold rounded-2xl cursor-pointer border border-white/40 bg-white/30 text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 transition-all duration-300 text-sm shadow-sm flex items-center justify-center gap-1.5"
            >
              Join Group
            </motion.button>
          </motion.div>
        ))}
      </div>
      
      {communities.length === 0 && !showCreate && (
        <div className="text-center py-16 text-gray-400 font-semibold glass-panel p-10 max-w-md mx-auto mt-10">
          <span className="text-4xl block mb-4">🌐</span>
          No communities yet. Be the first to start one!
        </div>
      )}
    </div>
  );
}
