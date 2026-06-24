import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './pages/Login';
import ProfileSetup from './pages/ProfileSetup';
import ProfileEdit from './pages/ProfileEdit';
import Discovery from './pages/Discovery';
import Connections from './pages/Connections';
import MyTeam from './pages/MyTeam';
import ProjectDashboard from './pages/ProjectDashboard';
import MentorDashboard from './pages/MentorDashboard';
import MyTeams from './pages/MyTeams';
import TeamDetails from './pages/TeamDetails';
import Chat from './pages/Chat';
import GroupChat from './pages/GroupChat';
import AdminDashboard from './pages/AdminDashboard';
import Layout from './components/Layout';

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        
        {/* Protected Routes wrapped in Layout */}
        <Route element={<Layout />}>
          <Route path="/profile-setup" element={<ProfileSetup />} />
          <Route path="/profile/edit" element={<ProfileEdit />} />
          <Route path="/discovery" element={<Discovery />} />
          <Route path="/connections" element={<Connections />} />
          <Route path="/my-team" element={<MyTeam />} />
          <Route path="/project-dashboard" element={<ProjectDashboard />} />
          <Route path="/mentor-dashboard" element={<MentorDashboard />} />
          <Route path="/my-teams" element={<MyTeams />} />
          <Route path="/my-teams/:teamId" element={<TeamDetails />} />
          <Route path="/chat/:connectionId" element={<Chat />} />
          <Route path="/chat/group/:groupId" element={<GroupChat />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/dashboard" element={<Navigate to="/discovery" replace />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
