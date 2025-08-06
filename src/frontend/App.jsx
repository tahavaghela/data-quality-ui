import React from 'react';
import {Routes, Route } from 'react-router-dom';
import Dashboard from './pages/dashboard';
import UploadFiles from './pages/uploadfiles';
import Reports from './pages/reports';
import Layout from './components/layout';
import UploadHistory from './pages/uploadhistory';
import LandingPage from './pages/landingpage';
import DetailedOverview from './pages/DetailedOverview';
import DataProfile from './pages/DataProfile';
import FailedCheck from './pages/FailedChecks';

function App() {
  return (
      <Routes>
        <Route path="/" element={<LandingPage />} /> 
        <Route path="/dashboard" element={<Layout title="Dashboard"><Dashboard /></Layout>} />
        <Route path="/upload-files" element={<Layout title="Upload Files"><UploadFiles /></Layout>} />
        <Route path="/reports" element={<Layout title="Reports"><Reports /></Layout>} />
        <Route path="/failed-check" element={<Layout title="Failed Check"><FailedCheck /></Layout>} />
        <Route path="/profile-summary" element={<Layout title="Data Profile"><DataProfile /></Layout>} />
        <Route path="/detailed-overview" element={<Layout title="Detailed Overview"><DetailedOverview /></Layout>} />
        <Route path="/upload-history" element={<Layout title="Upload History"><UploadHistory /></Layout>} />
      </Routes>
  );
}

export default App;
