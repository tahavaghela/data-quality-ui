import React, { useEffect, useState } from 'react';
import '../styles/headerbar.css';

const Header = ({ title = "Dashboard" }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/session`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (err) {
        console.error("Error fetching session:", err);
      }
    };

    fetchSession();
  }, []);

  return (
    <header className="top">
      <h1 className="head">{title}</h1>
      <div className="user-info">
        <i className="bi bi-bell icon"></i>
        <span className="user-text">
          <i className="bi bi-person-circle icon"></i>
          {user ? user.email || user.username || `User ${user.id}` : 'Loading...'}
        </span>
      </div>
    </header>
  );
};

export default Header;
