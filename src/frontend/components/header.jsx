import React from 'react';
import '../styles/headerbar.css';

const Header = ({ title = "Dashboard", user }) => {
  return (
    <header className="top">
      <h1 className="head">{title}</h1>
      <div className="user-info">
        <i className="bi bi-bell icon"></i>
        <span className="user-text">
          <i className="bi bi-person-circle icon"></i>
          {user ? user : 'Loading...'}
        </span>
      </div>
    </header>
  );
};

export default Header;
