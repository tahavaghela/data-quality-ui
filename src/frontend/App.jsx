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

// This component handles the login page, redirecting the user to Kinde
const Login = () => {
  const handleLogin = () => {
    window.location.href = import.meta.env.VITE_API_BASE_URL + '/api/login';
  };
  
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Welcome to DataVault</h1>
      <button 
        onClick={handleLogin}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Login with Kinde
      </button>
    </div>
  );
};

// This is the main application component with authentication logic
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await apiClient.get('/api/me');
        setUser(response.data.user);
      } catch (error) {
        // If the check fails (e.g., 401 Unauthorized), the user state remains null
        console.error("Authentication check failed:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await apiClient.get('/api/logout');
      setUser(null);
      navigate('/');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const ProtectedRoute = ({ children }) => {
    if (loading) {
      return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }
    if (!user) {
      // If no user, redirect to the login page
      return <Login />;
    }
    return <Layout user={user} onLogout={handleLogout}>{children}</Layout>;
  };
  
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} /> 
      <Route path="/callback" element={<Callback />} />
      <Route path="/login" element={<Login />} />

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
