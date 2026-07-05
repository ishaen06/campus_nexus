import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Inbox, 
  Star, 
  Send, 
  Paperclip, 
  Search, 
  Download, 
  Trash2, 
  Mail, 
  MailOpen, 
  User, 
  AlertCircle,
  X,
  Plus,
  SendHorizontal,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import api from '../api';
import Avatar from '../components/Avatar';

interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
}

interface NotificationItem {
  id: number;
  title: string;
  content: string;
  files: Attachment[];
  sender_email: string;
  sender_name: string;
  created_at: string;
}

export default function Notifications() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<'inbox' | 'starred' | 'important' | 'sent'>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Starred and Important state locally saved per user in localStorage
  const [starredIds, setStarredIds] = useState<number[]>(() => {
    const saved = localStorage.getItem('nexus_starred_notifs');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [importantIds, setImportantIds] = useState<number[]>(() => {
    const saved = localStorage.getItem('nexus_important_notifs');
    return saved ? JSON.parse(saved) : [];
  });

  // Selected Notification for Detail View
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

  // Compose Box Modal/Floating Box State
  const [isComposing, setIsComposing] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('nexus_starred_notifs', JSON.stringify(starredIds));
  }, [starredIds]);

  useEffect(() => {
    localStorage.setItem('nexus_important_notifs', JSON.stringify(importantIds));
  }, [importantIds]);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/users/me');
      setCurrentUser(res.data);
    } catch (err) {
      console.error("Failed to load user info", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchNotifications();
  }, []);

  const handleToggleStar = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setStarredIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleImportant = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setImportantIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const limit = 25 * 1024 * 1024; // 25MB
      
      const overLimit = filesArray.some(file => file.size > limit);
      if (overLimit) {
        setUploadError("Some files exceed the maximum size limit of 25MB.");
        return;
      }
      
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;

    setIsSending(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("title", subject);
    formData.append("content", body);
    selectedFiles.forEach(file => {
      formData.append("files", file);
    });

    try {
      await api.post('/notifications', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Reset compose state
      setSubject('');
      setBody('');
      setSelectedFiles([]);
      setIsComposing(false);
      
      // Reload feed
      fetchNotifications();
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || "Failed to post notification.");
    } finally {
      setIsSending(false);
    }
  };

  const isAdmin = currentUser?.is_admin || currentUser?.email === 'ishaen.vihaan@gmail.com';

  // Filter logic
  const filteredNotifications = notifications.filter(notif => {
    // Search query matches title, content, or sender
    const matchesSearch = searchQuery === '' || 
      notif.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notif.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notif.sender_name.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (!matchesSearch) return false;

    if (activeFolder === 'starred') {
      return starredIds.includes(notif.id);
    }
    if (activeFolder === 'important') {
      return importantIds.includes(notif.id);
    }
    if (activeFolder === 'sent') {
      // Sent folder matches notifications sent by the current admin user
      return notif.sender_email === currentUser?.email;
    }
    return true; // Inbox
  });

  const getFormatSize = (bytes: number) => {
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-900 text-slate-100 font-sans">
      
      {/* Gmail Left Sidebar Section */}
      <div className="w-full md:w-64 border-r border-slate-800 bg-slate-950/45 p-4 flex flex-col gap-6">
        
        {/* Compose Button for Admin */}
        {isAdmin && (
          <button
            onClick={() => setIsComposing(true)}
            className="flex items-center justify-center gap-3 bg-gradient-to-r from-red-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 text-white font-bold py-3.5 px-6 rounded-2xl transition shadow-lg shadow-indigo-600/10 cursor-pointer text-xs uppercase tracking-wider"
          >
            <Plus size={16} />
            Compose Post
          </button>
        )}

        {/* Categories Menu */}
        <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-1.5 no-scrollbar pb-2 md:pb-0">
          {[
            { id: 'inbox', label: 'Inbox', icon: Inbox },
            { id: 'starred', label: 'Starred', icon: Star },
            { id: 'important', label: 'Important', icon: AlertCircle },
            { id: 'sent', label: 'Sent', icon: Send },
          ].map(folder => {
            const Icon = folder.icon;
            const isActive = activeFolder === folder.id;
            return (
              <button
                key={folder.id}
                onClick={() => {
                  setActiveFolder(folder.id as any);
                  setSelectedNotif(null);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer w-full text-left ${
                  isActive 
                    ? 'bg-indigo-600/15 border-l-4 border-indigo-500 text-indigo-400 font-extrabold' 
                    : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                }`}
              >
                <Icon size={16} />
                <span>{folder.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Search bar */}
        <div className="border-b border-slate-800 p-4 bg-slate-950/20 backdrop-blur-md flex items-center justify-between gap-4">
          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl outline-none text-xs font-semibold text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all"
            />
          </div>
          
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:block">
            College Official Feed
          </div>
        </div>

        {/* Bottom Area: Split between List & Detail View */}
        <div className="flex-1 flex min-h-0 relative">
          
          {/* Notifications List Pane */}
          <div className={`flex-1 flex flex-col min-w-0 overflow-y-auto ${selectedNotif ? 'hidden lg:flex lg:w-1/2 border-r border-slate-800' : 'w-full'}`}>
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin mb-3"></div>
                <p className="text-xs text-slate-400 font-medium">Fetching notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <Mail size={40} className="text-slate-700 mb-3" />
                <p className="text-xs font-bold">No notifications found in {activeFolder}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {filteredNotifications.map(notif => {
                  const hasAttachments = notif.files && notif.files.length > 0;
                  const isStarred = starredIds.includes(notif.id);
                  const isImportant = importantIds.includes(notif.id);
                  
                  return (
                    <div
                      key={notif.id}
                      onClick={() => setSelectedNotif(notif)}
                      className={`p-4 flex gap-4 hover:bg-slate-800/40 cursor-pointer transition-all ${
                        selectedNotif?.id === notif.id ? 'bg-indigo-600/10' : ''
                      }`}
                    >
                      {/* Left: Star & Important icons */}
                      <div className="flex flex-col gap-2 items-center justify-start mt-0.5">
                        <button
                          onClick={(e) => handleToggleStar(e, notif.id)}
                          className={`hover:scale-110 transition-transform cursor-pointer ${
                            isStarred ? 'text-amber-500' : 'text-slate-600 hover:text-slate-400'
                          }`}
                        >
                          <Star size={15} fill={isStarred ? "currentColor" : "none"} />
                        </button>
                        <button
                          onClick={(e) => handleToggleImportant(e, notif.id)}
                          className={`hover:scale-110 transition-transform cursor-pointer ${
                            isImportant ? 'text-rose-500' : 'text-slate-600 hover:text-slate-400'
                          }`}
                        >
                          <AlertCircle size={15} fill={isImportant ? "currentColor" : "none"} />
                        </button>
                      </div>

                      {/* Content: Title, snippet, attachment indicator */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs font-black text-slate-200 truncate">
                            {notif.sender_name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap">
                            {new Date(notif.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        
                        <h4 className="text-xs font-extrabold text-slate-100 truncate flex items-center gap-1.5">
                          {notif.title}
                          {hasAttachments && <Paperclip size={11} className="text-indigo-400 shrink-0" />}
                        </h4>
                        
                        <p className="text-[11px] text-slate-400 font-medium truncate">
                          {notif.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Email Expanded Detail View Pane */}
          <div className={`flex-1 flex-col overflow-y-auto bg-slate-950/20 p-6 ${selectedNotif ? 'flex w-full lg:w-1/2' : 'hidden'}`}>
            {selectedNotif ? (
              <div className="space-y-6">
                
                {/* Back button for mobile view */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <button
                    onClick={() => setSelectedNotif(null)}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-100 text-xs font-bold cursor-pointer"
                  >
                    <ArrowLeft size={14} /> Back to List
                  </button>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => handleToggleStar(e, selectedNotif.id)}
                      className={`p-2 rounded-lg bg-slate-900 border border-slate-800 transition cursor-pointer ${
                        starredIds.includes(selectedNotif.id) ? 'text-amber-500' : 'text-slate-400'
                      }`}
                    >
                      <Star size={14} fill={starredIds.includes(selectedNotif.id) ? "currentColor" : "none"} />
                    </button>
                    <button
                      onClick={(e) => handleToggleImportant(e, selectedNotif.id)}
                      className={`p-2 rounded-lg bg-slate-900 border border-slate-800 transition cursor-pointer ${
                        importantIds.includes(selectedNotif.id) ? 'text-rose-500' : 'text-slate-400'
                      }`}
                    >
                      <AlertCircle size={14} fill={importantIds.includes(selectedNotif.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>

                {/* Email Subject Title */}
                <div>
                  <h2 className="text-xl font-extrabold text-slate-100 leading-tight">
                    {selectedNotif.title}
                  </h2>
                </div>

                {/* Sender Header Card */}
                <div className="flex items-center justify-between gap-4 p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Avatar config={null} name={selectedNotif.sender_name} size={38} />
                    <div>
                      <div className="text-xs font-black text-slate-200">
                        {selectedNotif.sender_name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        &lt;{selectedNotif.sender_email}&gt; • to me
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-[10px] text-slate-400 font-bold">
                    {new Date(selectedNotif.created_at).toLocaleString(undefined, { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                {/* Message Body Content */}
                <div className="text-slate-300 text-xs font-medium leading-relaxed whitespace-pre-wrap p-4 bg-slate-900/20 border border-slate-900/60 rounded-2xl min-h-[150px]">
                  {selectedNotif.content}
                </div>

                {/* Attachments Section */}
                {selectedNotif.files && selectedNotif.files.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Paperclip size={13} className="text-indigo-400" />
                      Attachments ({selectedNotif.files.length})
                    </h5>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedNotif.files.map(file => {
                        const dlUrl = api.defaults.baseURL ? `${api.defaults.baseURL.replace('/api', '')}${file.url}` : file.url;
                        return (
                          <div
                            key={file.id}
                            className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 flex justify-between items-center gap-3 hover:bg-slate-800/30 transition-all"
                          >
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-200 block truncate" title={file.name}>
                                {file.name}
                              </span>
                              <span className="text-[9px] text-slate-500 font-bold block mt-0.5">
                                {getFormatSize(file.size)}
                              </span>
                            </div>
                            <a
                              href={dlUrl}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-lg transition shrink-0 cursor-pointer"
                              title="Download Attachment"
                            >
                              <Download size={14} />
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center">
                <MailOpen size={45} className="text-slate-800 mb-3" />
                <h4 className="text-sm font-bold text-slate-400">No message selected</h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[220px]">Select a notification from the list to view its full details and files.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Gmail Compose Box Overlay */}
      <AnimatePresence>
        {isComposing && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className="fixed bottom-0 right-0 md:right-10 w-full max-w-lg bg-slate-950 border border-slate-800 rounded-t-2xl shadow-2xl z-50 flex flex-col max-h-[500px]"
          >
            {/* Compose header */}
            <div className="flex justify-between items-center p-4 bg-slate-900 rounded-t-2xl border-b border-slate-800">
              <span className="text-xs font-extrabold text-slate-200">New Post Notification</span>
              <button
                onClick={() => {
                  setIsComposing(false);
                  setSelectedFiles([]);
                  setUploadError(null);
                }}
                className="text-slate-500 hover:text-slate-200 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Compose form */}
            <form onSubmit={handleSendNotification} className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 space-y-4">
              
              {/* To field (All members indicator) */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <span className="text-xs text-slate-500 font-bold">To:</span>
                <span className="text-xs text-indigo-400 font-bold bg-indigo-950/45 px-2.5 py-0.5 rounded-full border border-indigo-900/35">
                  All Students & Mentors &lt;everyone@campusnexus.edu&gt;
                </span>
              </div>

              {/* Subject Title field */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <span className="text-xs text-slate-500 font-bold">Subject:</span>
                <input
                  type="text"
                  required
                  placeholder="Enter notification subject"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-200"
                />
              </div>

              {/* Message Body Content field */}
              <div className="flex-1 min-h-[140px]">
                <textarea
                  required
                  placeholder="Type notification message here..."
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={6}
                  className="w-full h-full bg-transparent border-none outline-none text-xs text-slate-300 resize-none leading-relaxed font-medium"
                />
              </div>

              {/* File Attachment list */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2 border-t border-slate-800/80 pt-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Attachments ({selectedFiles.length})</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-bold"
                      >
                        <span className="text-slate-300 truncate max-w-[150px]">{file.name}</span>
                        <span className="text-slate-500">({getFormatSize(file.size)})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="text-slate-500 hover:text-red-400 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error logs */}
              {uploadError && (
                <div className="text-red-500 text-xs font-bold bg-red-950/20 border border-red-900/40 p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Form Action Controls bar */}
              <div className="flex items-center justify-between border-t border-slate-800 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSending}
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-5 rounded-xl transition shadow-md shadow-indigo-600/10 cursor-pointer text-xs disabled:opacity-60"
                  >
                    {isSending ? "Sending..." : "Send"}
                    <SendHorizontal size={14} />
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800 rounded-xl transition cursor-pointer"
                    title="Attach Files"
                  >
                    <Paperclip size={15} />
                  </button>
                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsComposing(false);
                    setSubject('');
                    setBody('');
                    setSelectedFiles([]);
                    setUploadError(null);
                  }}
                  className="p-2.5 text-slate-600 hover:text-red-500 rounded-xl transition cursor-pointer"
                  title="Discard Draft"
                >
                  <Trash2 size={15} />
                </button>
              </div>

            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
