import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/landingpage.css';

const LandingPage = () => {
  const navigate = useNavigate();

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
          <button
            className="primary-btn"
            onClick={() => navigate('/dashboard')}
          >
            Get Started Today
          </button>
          <button className="secondary-btn">Learn More</button>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
