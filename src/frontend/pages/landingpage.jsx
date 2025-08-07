import React from 'react';
import '../styles/landingpage.css';

const LandingPage = () => {
  const handleLogin = () => {
    // Corrected to use VITE_API_BASE_URL for consistency
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/api/login`;
  };

  const handleRegister = () => {
    // Corrected to use VITE_API_BASE_URL for consistency
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/api/register`;
  };

  return (
    <div className="landing-container">
      <header className="landing-navbar">
        <div className="landing-logo">Data<span>Vault</span></div>
        <nav className="landing-nav">
          <a href="#">Home</a>
          <a href="#">Features</a>
          <a href="#">Data Flow</a>
          <a href="#">Contact</a>
        </nav>
      </header>

      <section className="landing-hero">
        <h1>Data Validation System</h1>
        <p>
          Ensure your data is accurate, reliable, and AI-ready in real time across
          all your sources.
        </p>
        <div className="landing-buttons">
          <button className="primary-btn" onClick={handleLogin}>Login</button>
          <button className="secondary-btn" onClick={handleRegister}>Register</button>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;