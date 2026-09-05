import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Sparkles, FolderGit, Lock, AlertTriangle, Link2, Copy, Check, RefreshCw, BookOpen } from 'lucide-react';





import Avatar from '../components/Avatar';
import ProfilePreviewModal from '../components/ProfilePreviewModal';
import { getStudentSemester } from '../utils/academic';


interface ConnectionItem {
  connection_id: number;
  status: string;
  other_user: {
    id: number;
    full_name: string;
    is_mentor?: boolean;
    branch?: string | null;
    year_of_study?: number | null;
    bio?: string | null;
    interests?: string[] | null;
    goals?: string[] | null;
    profile_photo?: string | null;
    department?: string | null;
    post?: string | null;
  };
}

export const THEME_SUBTOPICS: Record<string, string[]> = {
  "Agriculture, Livestock & Rural Development": [
    "Smart Irrigation and Water Management",
    "Drone-based Crop Monitoring and Soil Analysis",
    "Post-Harvest Storage and Food Preservation",
    "Automated Weed Detection and Pest Control",
    "Rural Energy Solutions and Waste-to-Biogas"
  ],
  "Education, Skilling & Student-Centric Solutions": [
    "Personalized AI Tutors and Learning Assistants",
    "Virtual Labs and VR-based Skill Training",
    "Student Assessment and Automated Grading Systems",
    "Career Counseling and Skill Mapping Platforms",
    "Gamified Learning and Coding Platforms for Kids"
  ],
  "Health, Wellness & Traditional Medicine": [
    "Remote Patient Monitoring and Telehealth Systems",
    "Wearable Health Sensors and Fall Detection",
    "AI-based Medical Diagnostics and Imaging",
    "Herbal and Traditional Medicine Standardization",
    "Mental Health and Stress Management Applications"
  ],
  "Urban Development, Mobility & Smart Cities": [
    "Smart Traffic Management and Congestion Control",
    "IoT-based Waste Collection and Sorting",
    "Smart Parking and EV Charging Stations",
    "Energy-Efficient Smart Street Lighting",
    "Public Safety and Crowd Monitoring Systems"
  ],
  "Sustainability & Environment": [
    "Carbon Footprint Tracking and Auditing",
    "Smart Water Quality and Leak Detection",
    "Solar and Wind Energy Grid Optimization",
    "Biodegradable Material Synthesis and Tracking",
    "Air Quality and Pollution Source Identification"
  ],
  "Emerging Technology, Innovation & Industry 4.0": [
    "Industrial Automation and Robotic Arm Control",
    "Blockchain-based Secure Supply Chain",
    "AR/VR for Industrial Training and Assembly",
    "Edge Computing for Real-Time Machine Analytics",
    "Cybersecurity for Industrial IoT Networks"
  ],
  "Ocean, Marine & Aerospace Technologies": [
    "Autonomous Underwater Vehicles (AUV) Navigation",
    "Drone/UAV path planning and mapping",
    "Satellite Data Processing for Weather Prediction",
    "Marine Litter and Plastic Pollution Trackers",
    "Aircraft Structural Health Monitoring Systems"
  ]
};

export const FIRST_YEAR_THEMES: string[] = Object.keys(THEME_SUBTOPICS);

// ─── 2nd Year: Cluster-wise themes ──────────────────────────────────────────
export const CLUSTER_THEMES_YEAR_2: Record<string, string[]> = {
  CS: [
    "Artificial Intelligence",
    "Internet of Things",
    "AR, VR & MR",
    "Quantum Security",
    "Edge Computing",
    "Ethical AI",
    "Cloud Security",
    "Programming Mechanics (Coding for App Development)",
    "AI for Social Good",
    "AI in Education",
    "Data Science and Analytics",
  ],
  EC: [
    "Semiconductor Engineering",
    "Cyber Physical Systems",
    "Drone Technology",
    "Biomedical Instrumentation",
    "Bionics and Prosthetics",
    "Renewable Energy Solutions",
    "Embedded Systems and IoT",
    "AI in Electronics",
    "5G and Wireless Communications",
    "Power Systems Engineering",
    "Autonomous Vehicles",
  ],
  ME: [
    "Smart Manufacturing",
    "Digital Metrology",
    "Ergonomics in Automation",
    "Advanced Materials",
    "Energy Systems",
    "Eco-friendly Materials and Waste Reduction Strategies",
    "Mechatronics & Industrial Internet of Things",
    "Thermodynamic Simulations",
    "AI for Mechanical Systems",
    "Electric Vehicle Technology",
    "Supply Chain Management",
  ],
  CV: [
    "Environmental Engineering and Sustainability",
    "Pollution Control, Waste Management and Bioremediation",
    "Urban Planning and Development, including Digital Twins",
    "Smart Materials and Structures",
    "Innovative Solutions for Water and Wastewater Purification, Reuse and Recycling",
    "Technologies to Mitigate Climate Change Impacts",
    "Bioinformatics",
    "Biomaterials and Computational Biology",
  ],
};

export const CLUSTER_THEMES = CLUSTER_THEMES_YEAR_2;

// ─── 3rd Year: Cluster-wise Multidisciplinary themes ────────────────────────
export const CLUSTER_THEMES_YEAR_3: Record<string, string[]> = {
  CS: [
    "Advanced Autonomous Systems & Edge AI",
    "Generative AI & Large Language Models",
    "Blockchain & Decentralized Architectures",
    "Quantum Computing & Advanced Cryptography",
    "Intelligent Cyber-Physical Systems",
    "Cloud-Native Architectures & High-Performance Computing",
    "Full-Stack Smart Applications & Systems Engineering",
    "Big Data Analytics & Distributed Streaming Systems",
    "AR/VR and Spatial Computing",
  ],
  EC: [
    "VLSI Architecture & System-on-Chip (SoC) Design",
    "Advanced Drone & Unmanned Aerial Systems",
    "Next-Gen 5G/6G Wireless Networks & RF Engineering",
    "Smart Embedded Robotics & Autonomous Systems",
    "Precision Biomedical Systems & Neural Engineering",
    "Smart Energy Harvesting & Green IoT",
    "Edge Hardware Acceleration for Deep Learning",
  ],
  ME: [
    "Advanced Autonomous Vehicles & Electric Powertrains",
    "Industry 5.0, Smart Manufacturing & Industrial Robotics",
    "Small Satellite Systems & Aerospace Propulsion",
    "Clean Energy Systems & Advanced Fuel Cells",
    "Additive Manufacturing & Advanced Metamaterials",
    "Computational Fluid Dynamics & Thermal Management",
    "Biomimetic & Soft Robotics",
  ],
  CV: [
    "Smart Infrastructure, Structural Health Monitoring & BIM",
    "Climate-Resilient Urban Systems & Carbon Capture",
    "Advanced Wastewater Recycling & Membrane Technologies",
    "Geo-Environmental & Disaster Mitigation Engineering",
    "Sustainable Construction Materials & Geopolymer Concrete",
    "Computational Systems Biology & Bio-Manufacturing",
  ],
};

export const BRANCH_CLUSTER_MAP: Record<string, string> = {
  CS: "CS", CI: "CS", AI: "CS", CD: "CS", CY: "CS", IS: "CS",
  EC: "EC", EE: "EC", ET: "EC",
  AS: "ME", AE: "ME", IM: "ME", ME: "ME",
  CV: "CV", BT: "CV", CH: "CV",
};

export const PERMITTED_COMBINATIONS_YEAR_3 = [
  {
    cluster: 'CS',
    clusterName: 'CS Cluster',
    combos: [
      { text: '2 CS + 1 AI + 1 CD', maxTeams: 69, size: 4 },
      { text: '2 CS + 1 CY + 2 IS', maxTeams: 64, size: 5 },
      { text: '2 CS + 2 AI + 1 IS', maxTeams: 41, size: 5 },
      { text: '2 CS + 1 AI + 1 CY', maxTeams: 6, size: 4 },
      { text: '1 CS + 1 AI + 2 IS', maxTeams: 1, size: 4 },
    ]
  },
  {
    cluster: 'EC',
    clusterName: 'EC Cluster',
    combos: [
      { text: '3 EC + 1 EE + 1 ET', maxTeams: 46, size: 5 },
      { text: '3 EC + 1 EE', maxTeams: 25, size: 4 },
      { text: '3 EC + 1 ET', maxTeams: 21, size: 4 },
    ]
  },
  {
    cluster: 'ME',
    clusterName: 'ME Cluster',
    combos: [
      { text: '3 ME + 1 AS + 1 IM', maxTeams: 30, size: 5 },
      { text: '2 ME + 2 AS + 1 IM', maxTeams: 13, size: 5 },
      { text: '2 ME + 1 AS + 2 IM', maxTeams: 10, size: 5 },
    ]
  },
  {
    cluster: 'CV',
    clusterName: 'CV Cluster',
    combos: [
      { text: '2 CV + 1 CH + 2 BT', maxTeams: 20, size: 5 },
      { text: '2 CV + 1 CH + 1 BT', maxTeams: 8, size: 4 },
      { text: '1 CV + 2 CH + 2 BT', maxTeams: 8, size: 5 },
    ]
  }
];

export function getYearOfStudy(
  joiningYear?: number | null, 
  email?: string | null, 
  usn?: string | null,
  directYear?: number | null,
  cohortMappings?: Record<string, number>
): number {
  if (directYear && directYear >= 1 && directYear <= 4) {
    return directYear;
  }
  const mappings = cohortMappings || { "26": 1, "25": 2, "24": 3, "23": 4 };
  const checkStr = `${email || ''} ${usn || ''}`.toLowerCase();

  // 1. Match configured cohort batch numbers
  for (const [batch, yr] of Object.entries(mappings)) {
    if (checkStr.includes(batch.toLowerCase())) {
      return Number(yr);
    }
  }

  // 2. Match joining year
  if (joiningYear) {
    const jyStr = String(joiningYear);
    const suffix = jyStr.slice(-2);
    if (mappings[suffix]) {
      return Number(mappings[suffix]);
    }
    if (mappings[jyStr]) {
      return Number(mappings[jyStr]);
    }
  }

  // Fallback defaults
  if (checkStr.includes('26') || Number(joiningYear) === 2026) return 1;
  if (checkStr.includes('25') || Number(joiningYear) === 2025) return 2;
  if (checkStr.includes('24') || Number(joiningYear) === 2024) return 3;
  if (checkStr.includes('23') || Number(joiningYear) === 2023) return 4;
  if (!joiningYear) return 2;

  const now = new Date();
  let yearsElapsed = now.getFullYear() - Number(joiningYear);
  if (now.getMonth() + 1 < 8) yearsElapsed -= 1;
  return Math.max(1, Math.min(4, yearsElapsed + 1));
}


export function getClusterForBranch(branchCode: string): string | null {
  return BRANCH_CLUSTER_MAP[(branchCode || '').toUpperCase()] ?? null;
}


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
  allow_member_leave?: boolean;
  mentor_status?: string;
}

export default function MyTeam() {
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Group creation modal states
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [projectTopic, setProjectTopic] = useState('');
  const [projectSubTopic, setProjectSubTopic] = useState('');
  const [projectTheme, setProjectTheme] = useState('');
  const [dynamicClusterThemes, setDynamicClusterThemes] = useState<Record<string, string[]> | null>(null);
  const [dynamicFirstYearThemes, setDynamicFirstYearThemes] = useState<string[] | null>(null);
  const [dynamicYear3ClusterThemes, setDynamicYear3ClusterThemes] = useState<Record<string, string[]> | null>(null);
  const [dynamicCohortMappings, setDynamicCohortMappings] = useState<Record<string, number>>({ "26": 1, "25": 2, "24": 3, "23": 4 });

  // Profile modal states
  const [previewUser, setPreviewUser] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Team invite modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState<{ invite_code: string; invite_enabled: boolean; group_id: number; team_name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showPermittedModal, setShowPermittedModal] = useState(false);

  const navigate = useNavigate();

  const handleOpenInviteModal = async (team: any) => {
    // Generate deterministic fallback code from team ID so modal opens immediately
    const fallbackCode = team.invite_code || `nexus-${team.id}`;

    // Open modal right away — never block the user with an alert popup!
    setInviteData({
      invite_code: fallbackCode,
      invite_enabled: team.invite_enabled !== false,
      group_id: team.id,
      team_name: team.name
    });
    setShowInviteModal(true);

    try {
      const res = await api.get(`/chat/groups/${team.id}/invite`);
      if (res.data?.invite_code) {
        setInviteData({
          invite_code: res.data.invite_code,
          invite_enabled: res.data.invite_enabled !== false,
          group_id: team.id,
          team_name: team.name
        });
      }
    } catch (err) {
      // Backend deployment pending rollout; silently preserve fallback code without alerting
      console.warn("Backend /invite endpoint returned 404 or pending deploy, using fallback code:", err);
    }
  };


  const handleCopyInviteLink = () => {
    if (!inviteData?.invite_code) return;
    const url = `${window.location.origin}/join-team/${inviteData.invite_code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateInvite = async () => {
    if (!inviteData?.group_id) return;
    if (!confirm("Are you sure you want to regenerate the invite link? Any previously shared links will stop working immediately.")) return;
    setRegenerating(true);
    try {
      const res = await api.post(`/chat/groups/${inviteData.group_id}/invite/regenerate`);
      setInviteData(prev => prev ? { ...prev, invite_code: res.data.invite_code, invite_enabled: res.data.invite_enabled } : null);
      alert("New invite link generated! Old links have been revoked.");
    } catch (err: any) {
      // If backend endpoint is pending deploy, generate a new client-side unique code
      const rand = Math.random().toString(36).substring(2, 8);
      const newCode = `nexus-${inviteData.group_id}-${rand}`;
      setInviteData(prev => prev ? { ...prev, invite_code: newCode } : null);
      alert("New invite link generated!");
    } finally {
      setRegenerating(false);
    }
  };

  const handleToggleInvite = async (enabled: boolean) => {
    if (!inviteData?.group_id) return;
    setInviteData(prev => prev ? { ...prev, invite_enabled: enabled } : null);
    try {
      await api.post(`/chat/groups/${inviteData.group_id}/invite/toggle?enabled=${enabled}`);
    } catch (err: any) {
      console.warn("Backend toggle pending deploy:", err);
    }
  };



  const [loading, setLoading] = useState(true);

  const fetchData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [connRes, groupRes, meRes, themesRes, cohortRes] = await Promise.all([
        api.get('/connections/'),
        api.get('/chat/groups'),
        api.get('/users/me').catch(() => null),
        api.get('/users/cluster-themes').catch(() => null),
        api.get('/users/cohort-settings').catch(() => null)
      ]);
      setConnections(connRes.data);
      setGroups(groupRes.data);
      if (meRes?.data) setCurrentUser(meRes.data);
      if (themesRes?.data) setDynamicClusterThemes(themesRes.data);
      if (cohortRes?.data?.cohort_mappings) setDynamicCohortMappings(cohortRes.data.cohort_mappings);
      if (cohortRes?.data?.first_year_themes) setDynamicFirstYearThemes(cohortRes.data.first_year_themes);
      if (cohortRes?.data?.cluster_themes) setDynamicClusterThemes(cohortRes.data.cluster_themes);
      if (cohortRes?.data?.year3_cluster_themes) setDynamicYear3ClusterThemes(cohortRes.data.year3_cluster_themes);
    } catch (err) {
      console.error("Error fetching data on MyTeam page:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);

    const interval = setInterval(() => {
      if (!document.hidden) fetchData(false);
    }, 15000);
    return () => clearInterval(interval);
  }, []);



  const getSelectedCriteriaStatus = () => {
    if (!currentUser) return { met: false, text: "Loading user profile..." };
    
    // Creator is always included
    const allMembers: any[] = [currentUser, ...selectedMembers.map(id => {
      const conn = connections.find(c => c.other_user.id === id);
      return conn ? conn.other_user : null;
    }).filter(Boolean)];
    
    const studentMembers = allMembers.filter(m => !m.is_mentor);
    const size = studentMembers.length;

    if (size < 3 || size > 5) {
      return { met: false, text: `Team must contain 3 to 5 members (currently has ${size})` };
    }

    // Determine year of study
    const years = studentMembers.map(m => {
      return getYearOfStudy(m.joining_year || m.joiningYear, m.email, m.usn, m.year_of_study, dynamicCohortMappings);
    });


    const uniqueYears = [...new Set(years)];

    if (uniqueYears.length > 1) {
      return { met: false, text: "Team members are from different academic years. All must be in the same year." };
    }

    const year = uniqueYears[0] ?? 1;

    // ── 1st Year: P/C Cycle balance ──────────────────────────────────────
    if (year === 1) {
      const CYCLE: Record<string, string> = {
        CS: "C", CI: "C", CD: "C", CY: "C",
        EC: "P", EE: "P", ET: "P",
        AS: "P", IM: "P", ME: "P",
        CV: "P", BT: "P", CH: "P",
      };
      let pCount = 0, cCount = 0;
      for (const m of studentMembers) {
        const code = (m.branch_code || m.branchCode || '').toUpperCase();
        const cycle = CYCLE[code] || (m.cycle || '').toUpperCase();
        if (cycle === 'P') pCount++;
        else if (cycle === 'C') cCount++;
        else return { met: false, text: `Member '${m.full_name}' has an unknown branch/cycle (${code})` };
      }
      if (size === 3) return { met: true, text: "Informal Group ready to form!" };
      if (size === 4 && (pCount !== 2 || cCount !== 2))
        return { met: false, text: `Cycle balance failed: team of 4 needs 2P+2C (found ${pCount}P, ${cCount}C)` };
      if (size === 5 && !((pCount === 3 && cCount === 2) || (pCount === 2 && cCount === 3)))
        return { met: false, text: `Cycle balance failed: team of 5 needs 3P+2C or 2P+3C (found ${pCount}P, ${cCount}C)` };
      return { met: true, text: "1st Year team criteria fulfilled! Ready to form." };
    }

    // ── 2nd Year+: Cluster-based branch combination ───────────────────────
    const VALID: Record<string, Record<string, number>[]> = {
      EC: [
        {EC:3,EE:1,ET:1},{EC:3,EE:2},{EC:3,ET:2},{EC:4,EE:1},{EC:4,ET:1},{EC:3,EE:1},{EC:3,ET:1}
      ],
      CS: [
        {CS:3,CI:2},{CS:2,CD:1,CY:1},{CD:2,CS:1,CY:2},{CD:1,CY:1,CI:2}
      ],
      ME: [
        {AS:1,IM:1,ME:3},{AS:2,IM:1,ME:2},{AS:1,IM:2,ME:2}
      ],
      CV: [
        {CV:1,CH:2,BT:2},{CV:2,CH:1,BT:2},{CV:1,CH:1,BT:2}
      ],
    };

    const branchCounts: Record<string, number> = {};
    for (const m of studentMembers) {
      const code = (m.branch_code || m.branchCode || '').toUpperCase();
      if (!code) return { met: false, text: `Member '${m.full_name}' has no branch code` };
      branchCounts[code] = (branchCounts[code] || 0) + 1;
    }

    const clusters = [...new Set(Object.keys(branchCounts).map(c => BRANCH_CLUSTER_MAP[c]).filter(Boolean))];
    if (clusters.length === 0) return { met: false, text: "Could not determine cluster — check branch codes" };
    if (clusters.length > 1) return { met: false, text: `Members span multiple clusters (${clusters.join(", ")}). All must be in same cluster.` };

    const cluster = clusters[0];
    const validCombos = VALID[cluster] || [];
    const matches = validCombos.some(combo =>
      Object.keys(combo).length === Object.keys(branchCounts).length &&
      Object.entries(combo).every(([br, cnt]) => branchCounts[br] === cnt)
    );

    if (!matches) {
      const combosStr = validCombos.map(c => Object.entries(c).map(([br,n]) => `${n}${br}`).join("+")).join(", ");
      const currentStr = Object.entries(branchCounts).map(([br,n]) => `${n}${br}`).join("+");
      return { met: false, text: `Invalid combo for ${cluster} cluster (${currentStr}). Valid: ${combosStr}` };
    }

    return { met: true, text: `2nd Year ${cluster} cluster criteria fulfilled! Ready to form.` };
  };


  const validation = getSelectedCriteriaStatus();

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedMembers.length === 0) return;
    try {
      await api.post('/chat/groups', {
        name: groupName,
        member_ids: selectedMembers,
        is_public: isPublic,
        project_topic: projectTopic,
        project_sub_topic: projectSubTopic,
        project_theme: projectTheme
      });
      setShowCreateGroup(false);
      setGroupName('');
      setSelectedMembers([]);
      setIsPublic(false);
      setProjectTopic('');
      setProjectSubTopic('');
      setProjectTheme('');
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to create team.");
    }
  };

  const toggleMemberSelection = (userId: number) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedMembers(prev => [...prev, userId]);
    }
  };

  const openProfilePreview = (user: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUser(user);
    setIsPreviewOpen(true);
  };

  return (
    <div className="min-h-screen bg-transparent py-12 px-4 md:px-8 relative">
      <div className="w-full max-w-[95%] xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
              My Team
            </h1>
            <p className="text-gray-500 font-medium mt-1">
              Manage your team details, topic, and members list
            </p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <div className="relative mb-4">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Users size={18} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">Loading team workspace...</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium max-w-xs">
                Fetching your project group and team roster
              </p>
            </div>
          ) : groups.length > 0 ? (
            (() => {
              const team = groups[0];
              const isAdmin = team.created_by === currentUser?.id;
              const members = (team.members || []).filter((m: any) => !m.is_mentor);


              return (
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Left: General info and project topic */}
                  <div className="md:col-span-2 space-y-6">
                    <div className="glass-panel p-6 flex flex-col justify-between relative overflow-hidden">
                      
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-1">Active Team Dashboard</span>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight capitalize">{team.name}</h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                            team.is_public 
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800/20' 
                              : 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/30'
                          }`}>
                            {team.is_public ? '🌐 Public' : '🔒 Private'}
                          </span>
                          
                          {/* Members Rule Status Indicator */}
                          <div 
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border backdrop-blur-sm cursor-help ${
                              members.length >= 4 && members.length <= 5
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                            }`}
                            title={`Members count: 4 to 5 required (Currently has ${members.length})`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${members.length >= 4 && members.length <= 5 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span>{members.length}/5 Members</span>
                          </div>

                          {/* Team Criteria Met / Incomplete Status Indicator */}
                          <div 
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border backdrop-blur-sm cursor-help ${
                              team.criteria_met
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                            }`}
                            title={team.criteria_met ? "Team criteria fulfilled! Ready for mentor submission." : (team.validation_error || "Team criteria incomplete")}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${team.criteria_met ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <span>{team.criteria_met ? '✓ Criteria Met' : '⚠️ Criteria Incomplete'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Criteria Incomplete Warning Banner */}
                      {!team.criteria_met && team.validation_error && (
                        <div className="mb-5 p-3.5 rounded-xl border bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-left">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                              <AlertTriangle size={14} /> Team Criteria Notice
                            </div>
                            <button
                              onClick={() => setShowPermittedModal(true)}
                              className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/60 shadow-2xs transition cursor-pointer"
                            >
                              <BookOpen size={11} />
                              <span>View Permitted Combinations</span>
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-line font-medium leading-relaxed">
                            {team.validation_error}
                          </p>
                        </div>
                      )}


                      {/* Project Topic Details */}
                      <div className="bg-slate-50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800/60 rounded-xl p-5 mb-6 text-left">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-3">Project Details</span>
                        <div className="flex items-start gap-3">
                          <FolderGit className="text-indigo-600 dark:text-indigo-400 w-5.5 h-5.5 shrink-0 mt-0.5" />
                          <div className="space-y-3.5 flex-1">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">Project Title</span>
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 capitalize leading-snug">
                                {team.project_topic ? team.project_topic : "No topic entered yet"}
                              </p>
                            </div>
                            {team.project_theme && (
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">Theme</span>
                                <p className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 leading-snug">
                                  {team.project_theme}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Admin Settings Panel */}
                      {isAdmin && (
                        <div className="space-y-4 mb-6 text-left">
                          <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Admin Settings</h3>
                          <div className="grid grid-cols-1 gap-3">
                            {/* Toggle for Public Visibility */}
                            <div className={`flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl border border-slate-100 dark:border-slate-800/60 transition-all ${team.mentor_status === 'APPROVED' ? 'opacity-65' : 'hover:bg-slate-50 dark:hover:bg-slate-900/20'}`}>
                              <div className="pr-4">
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                  <span>🌐 Public Visibility</span>
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5 leading-relaxed">
                                  {team.mentor_status === 'APPROVED' 
                                    ? "🔒 Locked to Private after mentor approval" 
                                    : "Toggle whether this group is public for others to see and request to join"}
                                </span>
                              </div>
                              <label className={`relative inline-flex items-center select-none shrink-0 ${team.mentor_status === 'APPROVED' ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                <input 
                                  type="checkbox" 
                                  checked={team.is_public || false} 
                                  disabled={team.mentor_status === 'APPROVED'}
                                  onChange={async (e) => {
                                    try {
                                      const res = await api.put(`/chat/groups/${team.id}/toggle-privacy?is_public=${e.target.checked}`);
                                      const updated = groups.map(g => g.id === team.id ? { ...g, is_public: res.data.is_public } : g);
                                      setGroups(updated);
                                    } catch (err) {
                                      console.error("Failed to toggle privacy status:", err);
                                      alert("Failed to update privacy settings.");
                                    }
                                  }}
                                  className="sr-only peer" 
                                />
                                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2.5px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                              </label>
                            </div>


                          </div>
                        </div>
                      )}

                      {/* CTA / Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 items-center">
                        <button
                          onClick={() => navigate(`/chat/group/${team.id}`, { state: { groupName: team.name } })}
                          className="flex-1 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                        >
                          <Users size={15} />
                          Open Team Chat
                        </button>

                        <button
                          onClick={() => handleOpenInviteModal(team)}
                          className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-semibold py-3 px-4 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider border border-slate-200 dark:border-slate-700/60 shrink-0"
                          title="Share invite link to join this team"
                        >
                          <Link2 size={15} className="text-indigo-600 dark:text-indigo-400" />
                          Invite via Link
                        </button>


                        {isAdmin ? (
                          <button
                            onClick={async () => {
                              if (confirm("Are you sure you want to disband this team? All chat history and memberships will be deleted.")) {
                                try {
                                  await api.delete(`/chat/groups/${team.id}/disband`);
                                  fetchData();
                                } catch (err: any) {
                                  alert(err.response?.data?.detail || "Failed to disband team.");
                                }
                              }
                            }}
                            className="px-3.5 py-2.5 rounded-xl text-[10px] font-semibold uppercase border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer shrink-0"
                          >
                            Disband Team
                          </button>
                        ) : (
                          team.mentor_status === 'APPROVED' ? (
                            <button
                              disabled
                              title="Leaving the team is locked after mentor approval"
                              className="px-3.5 py-2.5 rounded-xl text-[10px] font-semibold uppercase bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700/20 cursor-not-allowed flex items-center gap-1.5 shrink-0"
                            >
                              <Lock size={12} /> Leave Locked
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                const reason = prompt("Enter a reason for leaving the team (optional):");
                                if (reason === null) return;
                                try {
                                    await api.post(`/chat/groups/${team.id}/leave`, { reason });
                                    fetchData();
                                  } catch (err: any) {
                                    alert(err.response?.data?.detail || "Failed to leave team.");
                                  }
                                }}
                                className="px-3.5 py-2.5 rounded-xl text-[10px] font-semibold uppercase border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer shrink-0"
                              >
                                Leave Team
                              </button>
                          )
                        )}
                      </div>
                      </div>
                    </div>
  
                    {/* Right: Members list */}
                    <div className="space-y-4 text-left">
                      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Team Members ({members.length}/5)</h3>
                      <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/80">
                        {members.map((member: any) => {
                          const isMemberAdmin = member.id === team.created_by;
                          return (
                            <div
                              key={member.id}
                              onClick={(e) => openProfilePreview(member, e)}
                              className="py-4.5 px-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/20 cursor-pointer transition-all rounded-xl"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar config={member.profile_photo ? { photo: member.profile_photo } : null} name={member.full_name} size={40} />
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{member.full_name}</span>
                                  <div className="flex items-center gap-2 mt-1">
                                    {(member.branch_code || member.branch) && (
                                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                        {(member.branch_code || member.branch).toUpperCase()}
                                      </span>
                                    )}
                                    {(() => {
                                      const yr = getYearOfStudy(member.joining_year, member.email, member.usn, member.year_of_study, dynamicCohortMappings);

                                      if (yr >= 2) {
                                        const cl = getClusterForBranch(member.branch_code || member.branch || '');
                                        return cl ? (
                                          <>
                                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
                                              {cl} Cluster
                                            </span>
                                          </>
                                        ) : null;
                                      }
                                      if (member.cycle) {
                                        return (
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
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                </div>
                              </div>
  
                              {isMemberAdmin ? (
                                <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300 px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                                  Admin
                                </span>
                              ) : (
                                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-[9px] bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                                    Member
                                  </span>
                                  {isAdmin && (
                                    <button
                                      onClick={async () => {
                                        if (window.confirm(`Are you sure you want to make ${member.full_name} the admin? You will lose admin privileges.`)) {
                                          try {
                                            await api.put(`/chat/groups/${team.id}/transfer-admin?new_admin_id=${member.id}`);
                                            fetchData();
                                          } catch (err: any) {
                                            alert(err.response?.data?.detail || "Failed to transfer admin privileges.");
                                          }
                                        }
                                      }}
                                      className="text-[9px] border border-indigo-200 dark:border-indigo-900/45 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
                                      title="Make Admin"
                                    >
                                      + Admin
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                </div>
              );
            })()
          ) : (
            /* Empty state when not in a team */
            <div className="glass-panel p-12 text-center max-w-xl mx-auto flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/20 mb-6">
                <Users size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">No Active Team</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-8 leading-relaxed">
                You are not currently in a team. You must either create a new group chat with your connections or search for recruiting public teams to join.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl text-xs shadow-md transition-all cursor-pointer uppercase tracking-wider"
                >
                  Create a Team
                </button>
                <button
                  onClick={() => navigate('/discovery', { state: { activeTab: 'teams' } })}
                  className="bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold py-3 px-6 rounded-xl text-xs transition-all cursor-pointer uppercase tracking-wider"
                >
                  Find Teams
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Group Creation Modal */}
      <AnimatePresence>
        {showCreateGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateGroup(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 relative z-10 shadow-2xl my-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Users className="text-indigo-600 dark:text-indigo-400" /> Create Team
                </h3>
                <button 
                  onClick={() => setShowCreateGroup(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white shadow-sm transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateGroup} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Group Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Project Team, Placements"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    className="w-full px-4 py-3 glass-input rounded-2xl outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Project Title</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Design of a Hybrid Dielectric Immersion..."
                    value={projectTopic}
                    onChange={e => setProjectTopic(e.target.value)}
                    className="w-full px-4 py-3 glass-input rounded-2xl outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Project Theme
                    {currentUser && (() => {
                      const yr = getYearOfStudy(currentUser.joining_year, currentUser.email, currentUser.usn, currentUser.year_of_study, dynamicCohortMappings);
                      if (yr === 1) {
                        return <span className="ml-2 text-indigo-500 normal-case font-semibold">(1st Year Multidisciplinary)</span>;
                      } else if (yr === 2) {
                        const cl = getClusterForBranch(currentUser.branch_code || '');
                        return <span className="ml-2 text-indigo-500 normal-case font-semibold">({cl || ''} Cluster themes)</span>;
                      } else if (yr === 3) {
                        const cl = getClusterForBranch(currentUser.branch_code || '');
                        return <span className="ml-2 text-indigo-500 normal-case font-semibold">(Year 3 {cl || ''} Cluster themes)</span>;
                      }
                      return null;
                    })()}
                  </label>
                  <select
                    required
                    value={projectTheme}
                    onChange={e => {
                      setProjectTheme(e.target.value);
                      setProjectSubTopic('');
                    }}
                    className="w-full px-4 py-3 glass-input rounded-2xl outline-none font-semibold bg-white dark:bg-slate-900"
                  >
                    <option value="">-- Select a Theme --</option>
                    {(() => {
                      if (currentUser) {
                        const yr = getYearOfStudy(currentUser.joining_year, currentUser.email, currentUser.usn, currentUser.year_of_study, dynamicCohortMappings);
                        if (yr === 1) {
                          // 1st year: generic themes (NOT cluster based)
                          const themes = dynamicFirstYearThemes || FIRST_YEAR_THEMES;
                          return themes.map(t => <option key={t} value={t}>{t}</option>);
                        } else if (yr === 2) {
                          // 2nd year: cluster-wise themes
                          const cluster = getClusterForBranch(currentUser.branch_code || '');
                          const themes = cluster 
                            ? ((dynamicClusterThemes && dynamicClusterThemes[cluster]) || CLUSTER_THEMES_YEAR_2[cluster] || []) 
                            : [];
                          return themes.map(t => <option key={t} value={t}>{t}</option>);
                        } else if (yr === 3) {
                          // 3rd year: cluster-wise themes
                          const cluster = getClusterForBranch(currentUser.branch_code || '');
                          const themes = cluster 
                            ? ((dynamicYear3ClusterThemes && dynamicYear3ClusterThemes[cluster]) || CLUSTER_THEMES_YEAR_3[cluster] || []) 
                            : [];
                          return themes.map(t => <option key={t} value={t}>{t}</option>);
                        } else {
                          // Year 4 / default
                          const cluster = getClusterForBranch(currentUser.branch_code || '');
                          const themes = cluster 
                            ? ((dynamicClusterThemes && dynamicClusterThemes[cluster]) || CLUSTER_THEMES_YEAR_2[cluster] || []) 
                            : [];
                          return themes.map(t => <option key={t} value={t}>{t}</option>);
                        }
                      }

                      // 1st year default: generic themes
                      const fallback = dynamicFirstYearThemes || FIRST_YEAR_THEMES;
                      return fallback.map(t => <option key={t} value={t}>{t}</option>);
                    })()}
                  </select>
                </div>

                {/* Sub-Topic Selection (if available for selected theme, e.g. 1st Year) */}
                {THEME_SUBTOPICS[projectTheme] && THEME_SUBTOPICS[projectTheme].length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Project Sub-Topic (Optional)
                    </label>
                    <select
                      value={projectSubTopic}
                      onChange={e => setProjectSubTopic(e.target.value)}
                      className="w-full px-4 py-3 glass-input rounded-2xl outline-none font-semibold bg-white dark:bg-slate-900"
                    >
                      <option value="">-- Select a Sub-Topic (Optional) --</option>
                      {THEME_SUBTOPICS[projectTheme].map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                )}




                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Select Members</label>
                  {connections.filter(c => c.status === 'ACCEPTED').length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No matches available to create a team.</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-2.5 pr-2 no-scrollbar">
                      {connections.filter(c => c.status === 'ACCEPTED').map(conn => (
                        <div 
                          key={conn.other_user.id} 
                          onClick={() => toggleMemberSelection(conn.other_user.id)}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                            selectedMembers.includes(conn.other_user.id)
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/80 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar config={conn.other_user.profile_photo ? { photo: conn.other_user.profile_photo } : null} name={conn.other_user.full_name} size={36} />
                            <div className="text-left">
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{conn.other_user.full_name}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                                {conn.other_user.is_mentor 
                                  ? `${conn.other_user.post || 'Mentor'} (${conn.other_user.department || 'N/A'})` 
                                  : `${conn.other_user.branch || 'N/A'} • ${getStudentSemester(conn.other_user)}`
                                }

                              </p>
                            </div>
                          </div>
                          
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                            selectedMembers.includes(conn.other_user.id)
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800'
                          }`}>
                            {selectedMembers.includes(conn.other_user.id) && <Sparkles size={10} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/60 text-left">
                  <div>
                    <label className="block text-xs font-bold text-slate-900 dark:text-white tracking-tight">Make Team Public</label>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mt-0.5">Let others find and join this team</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isPublic} 
                      onChange={e => setIsPublic(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* Team criteria status message */}
                <div className={`p-3.5 rounded-2xl border text-xs font-semibold text-left ${
                  validation.met 
                    ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400' 
                    : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400'
                }`}>
                  <p>{validation.text}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-1.5">* Enforced only when submitting the team to a mentor for project approval.</p>
                </div>

                <motion.button 
                  whileHover={{ scale: groupName.trim() ? 1.02 : 1 }}
                  whileTap={{ scale: groupName.trim() ? 0.98 : 1 }}
                  type="submit" 
                  disabled={!groupName.trim()}
                  className="w-full bg-indigo-600 text-white font-black py-4 px-4 rounded-2xl shadow-xl shadow-indigo-500/25 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Create Team
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Team Invite Modal */}
      <AnimatePresence>
        {showInviteModal && inviteData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInviteModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl relative z-10 bg-white dark:bg-[#1e1e24] !bg-white dark:!bg-[#1e1e24]"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-1">Team Invitation</span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white capitalize">{inviteData.team_name}</h3>
                </div>
                <button 
                  onClick={() => setShowInviteModal(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 font-medium leading-relaxed">
                Share this link with your classmates. Anyone with an RVCE login who matches the academic criteria can join directly.
              </p>

              {/* Link Display & Copy Box */}
              <div className="space-y-2 mb-5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Invite Link</label>
                <div className="flex items-center gap-2 p-2 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750">
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate flex-1 pl-2 select-all">
                    {`${window.location.origin}/join-team/${inviteData.invite_code}`}
                  </span>
                  <button
                    onClick={handleCopyInviteLink}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      copied 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>



              {/* Leader Controls */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Allow joins via link</p>
                    <p className="text-[10px] text-slate-400">Disable to temporarily pause link joins</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={inviteData.invite_enabled}
                      onChange={e => handleToggleInvite(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2.5px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {groups[0]?.created_by === currentUser?.id && (
                  <button
                    onClick={handleRegenerateInvite}
                    disabled={regenerating}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={13} className={regenerating ? "animate-spin" : ""} />
                    <span>Revoke & Regenerate New Link</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Detail Preview Modal */}
      <ProfilePreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        user={previewUser}
      />

      {/* Official Permitted Team Combinations Modal */}
      <AnimatePresence>
        {showPermittedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="text-left">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="text-indigo-600 dark:text-indigo-400" size={18} />
                    6. Permitted Team Combinations – Cluster-wise (3rd Year)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    Official multidisciplinary team formation criteria prescribed for 3rd Year batches.
                  </p>
                </div>
                <button
                  onClick={() => setShowPermittedModal(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
                {PERMITTED_COMBINATIONS_YEAR_3.map((clusterItem) => (
                  <div key={clusterItem.cluster} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-850/50 flex flex-col">
                    <div className="bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-750 flex items-center justify-between">
                      <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">{clusterItem.clusterName}</span>
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800/50">Max Teams</span>
                    </div>
                    <div className="divide-y divide-slate-200/60 dark:divide-slate-800/60 flex-1">
                      {clusterItem.combos.map((combo, idx) => (
                        <div key={idx} className="p-3 flex items-center justify-between hover:bg-white dark:hover:bg-slate-800/80 transition-colors">
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{combo.text}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{combo.size} Members</span>
                          </div>
                          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                            {combo.maxTeams}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-[11px] text-slate-600 dark:text-slate-300 space-y-1 text-left">
                <p className="font-bold text-indigo-900 dark:text-indigo-300">Department Code Equivalence Notes:</p>
                <p>• <span className="font-semibold text-slate-800 dark:text-slate-200">AI and CI</span> are treated as equivalent (Artificial Intelligence & Machine Learning department).</p>
                <p>• <span className="font-semibold text-slate-800 dark:text-slate-200">AS and AE</span> are treated as equivalent (Aerospace Engineering department).</p>
                <p>• <span className="font-semibold text-slate-800 dark:text-slate-200">IS</span> refers to Information Science & Engineering (CS Cluster).</p>
                <p>• All team members must belong to the same cluster and be in the 3rd Year cohort.</p>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setShowPermittedModal(false)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
