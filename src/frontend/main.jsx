import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { KindeProvider } from '@kinde-oss/kinde-auth-react';
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <KindeProvider
      clientId="7c69fa195bac4b8b92c5af7803408b72"
      domain="https://datavalidationsystem.kinde.com"
      redirectUri="http://localhost:5173/dashboard"
      logoutUri="http://localhost:5173"
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </KindeProvider>
  </StrictMode>
);
