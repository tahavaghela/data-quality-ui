import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/dashboard';
import UploadFiles from './pages/uploadfiles';
import Reports from './pages/reports';
import Layout from './components/layoutt';
import UploadHistory from './pages/uploadhistory';
import LandingPage from './pages/landingpage';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Layout title="Dashboard"><Dashboard /></Layout>} />
        <Route path="/upload-files" element={<Layout title="Upload Files"><UploadFiles /></Layout>} />
        <Route path="/reports" element={<Layout title="Reports"><Reports /></Layout>} />
        <Route path="/upload-history" element={<Layout title="Upload History"><UploadHistory /></Layout>} />
      </Routes>
    </Router>
  );
}

export default App;