import React from 'react';
import Sidebar from './sidebar';
import Header from './header';

const Layout = ({ children, title, user, onLogout }) => {
  return (
    <div className="dashboard-wrapper flex h-screen overflow-hidden">
      <Sidebar onLogout={onLogout} />
      <div className="main-area flex-1 flex flex-col overflow-y-auto bg-gray-50">
        <Header title={title} user={user} />
        <main className="content p-6">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
