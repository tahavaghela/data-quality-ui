// LandingPage.jsx

import React from 'react';
import '../styles/landingpage.css';

const LandingPage = () => {
  const handleLogin = () => {
    // Use the same environment variable for all backend calls
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/api/login`;
  };

  const handleRegister = () => {
    // If your backend handles register separately:
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/api/register`;
  };

  return (
    // ... rest of your JSX
    <div className="landing-container">
      {/* ... */}
    </div>
  );
};

export default LandingPage;