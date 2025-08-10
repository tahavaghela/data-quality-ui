import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Dashboard from './pages/dashboard';
import UploadFiles from './pages/uploadfiles';
import Reports from './pages/reports';
import Layout from './components/layout';
import UploadHistory from './pages/uploadhistory';
import LandingPage from './pages/landingpage';
import DetailedOverview from './pages/DetailedOverview';
import DataProfile from './pages/DataProfile';
import FailedChecks from './pages/FailedChecks';
import Callback from "./pages/Callback";
import apiClient from "./apiClient";

const ProtectedRoute = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await apiClient.get('/api/me');
        setUser(response.data.user);
      } catch (error) {
        console.error("Authentication check failed:", error);
        navigate('/'); // Redirect to landing page on authentication failure
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-200">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await apiClient.get('/api/logout');
      navigate('/');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (!user) {
    return <LandingPage />; // Or a dedicated Login component
  }

  return (
    <Layout user={user} onLogout={handleLogout}>
      {children}
    </Layout>
  );
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} /> 
      <Route path="/callback" element={<Callback />} />

      {/* Protected Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/upload-files" element={<ProtectedRoute><UploadFiles /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/failed-check" element={<ProtectedRoute><FailedChecks /></ProtectedRoute>} />
      <Route path="/profile-summary" element={<ProtectedRoute><DataProfile /></ProtectedRoute>} />
      <Route path="/detailed-overview" element={<ProtectedRoute><DetailedOverview /></ProtectedRoute>} />
      <Route path="/upload-history" element={<ProtectedRoute><UploadHistory /></ProtectedRoute>} />
    </Routes>
  );
}

export default App;
