import React from 'react';
import '../styles/headerbar.css';

const Header = ({ title = "Dashboard", userId = "0454877689" }) => {
  return (
    <header className="top">
      <h1 className="head">{title}</h1>
      <div className="user-info">
        <i className="bi bi-bell icon"></i>
        <span className="user-text">
          <i className="bi bi-person-circle icon"></i>
          User {userId}
        </span>
      </div>
    </header>
  );
};

export default Header;