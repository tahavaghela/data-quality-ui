import React from 'react';
import '../styles/landingpage.css';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

const LandingPage = () => {
  const { login, register } = useKindeAuth();

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
          <button className="primary-btn" onClick={() => login()}>Login</button>
          <button className="secondary-btn" onClick={() => register()}>Register</button>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
