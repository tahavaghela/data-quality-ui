import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Callback = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // This component is only for handling the redirect from Kinde.
        // The backend has already set the access_token cookie.
        // We now simply redirect the user to the dashboard.
        // The App.jsx useEffect will then detect the new cookie and render correctly.
        navigate('/dashboard');
    }, [navigate]);

    return (
        <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-200">
            <h1 className="text-xl">Authentication successful. Redirecting...</h1>
        </div>
    );
};

export default Callback;
