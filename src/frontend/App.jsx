import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
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

const ProtectedContent = ({ user, onLogout }) => (
  <Layout user={user} onLogout={onLogout}>
    <Routes>
      <Route path="/dashboard" element={<Dashboard user={user} onLogout={onLogout} />} />
      <Route path="/upload-files" element={<UploadFiles />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/failed-check" element={<FailedChecks />} />
      <Route path="/profile-summary" element={<DataProfile />} />
      <Route path="/detailed-overview" element={<DetailedOverview />} />
      <Route path="/upload-history" element={<UploadHistory />} />
      {/* Fallback for protected routes */}
      <Route path="*" element={<Dashboard user={user} onLogout={onLogout} />} />
    </Routes>
  </Layout>
);

const PublicContent = ({ handleLogin }) => (
  <Routes>
    <Route path="/" element={<LandingPage handleLogin={handleLogin} />} />
    <Route path="/callback" element={<Callback />} />
    <Route path="/login" element={<LandingPage handleLogin={handleLogin} />} />
    {/* Redirect any unmatched route to the landing page */}
    <Route path="*" element={<LandingPage handleLogin={handleLogin} />} />
  </Routes>
);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Prevent authentication check on public routes where a cookie might not be set yet.
    if (location.pathname === '/callback' || location.pathname === '/login' || location.pathname === '/') {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const response = await apiClient.get('/api/me');
        setUser(response.data.user);
      } catch (error) {
        console.error("Authentication check failed:", error);
        setUser(null);
        // Redirect to login only if the user is not on a public route and is not authenticated
        if (location.pathname !== '/callback' && location.pathname !== '/login' && location.pathname !== '/') {
            navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [location.pathname, navigate]);

  const handleLogout = async () => {
    try {
      await apiClient.get('/api/logout');
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  
  const handleLogin = () => {
    window.location.href = import.meta.env.VITE_API_BASE_URL + '/api/login';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-200">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  // Conditionally render based on authentication status
  if (user) {
    return <ProtectedContent user={user} onLogout={handleLogout} />;
  } else {
    return <PublicContent handleLogin={handleLogin} />;
  }
}

export default App;