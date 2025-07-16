import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/sidebar.css';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${darkMode ? 'dark' : ''}`}>
      <div className="sidebar-header">
        <h2><i className="bi bi-shield-lock-fill"></i> {!collapsed && 'DataVault'}</h2>
        <button className="toggle-btn" onClick={() => setCollapsed(!collapsed)}>
          <i className={`bi ${collapsed ? 'bi-chevron-double-right' : 'bi-chevron-double-left'}`}></i>
        </button>
      </div>

      <nav>
        <NavLink to="/" title="Dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
          <i className="bi bi-grid-3x3-gap-fill"></i>
          {!collapsed && 'Dashboard'}
        </NavLink>
        <NavLink to="/upload-files" title="Upload Files" className={({ isActive }) => isActive ? 'active' : ''}>
          <i className="bi bi-upload"></i>
          {!collapsed && 'Upload Files'}
        </NavLink>
        <NavLink to="/reports" title="Reports" className={({ isActive }) => isActive ? 'active' : ''}>
          <i className="bi bi-bar-chart"></i>
          {!collapsed && 'Reports'}
        </NavLink>
        <NavLink to="/upload-history" title="Upload History" className={({ isActive }) => isActive ? 'active' : ''}>
          <i className="bi bi-clock-history"></i>
          {!collapsed && 'Upload History'}
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button className="dark-toggle" onClick={() => setDarkMode(!darkMode)}>
          <i className={`bi ${darkMode ? 'bi-brightness-high' : 'bi-moon'}`}></i>
          {!collapsed && (darkMode ? ' Light Mode' : ' Dark Mode')}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;