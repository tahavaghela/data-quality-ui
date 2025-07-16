import React from 'react';
import '../styles/headerbar.css';

const Header = ({ title = "Dashboard", userId = "0454877689" }) => {
  return (
    <header className="top flex justify-between items-center border-b">
      <h1 className="head text-xl font-semibold">{title}</h1>
      <div className="user-info flex items-center gap-3 text-sm text-gray-600">
        <i className="bi bi-bell"></i>
        <span><i className="bi bi-person-circle"></i> User {userId}</span>
      </div>
    </header>
  );
};

export default Header;
