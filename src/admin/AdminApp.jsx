import React, { useState, useEffect } from 'react';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';

const AdminApp = () => {
    const [admin, setAdmin] = useState(null);

    useEffect(() => {
        // Check local storage for persistent login
        const storedAdmin = localStorage.getItem('blitzit_admin');
        if (storedAdmin) {
            setAdmin(JSON.parse(storedAdmin));
        }
    }, []);

    const handleLogin = (adminData) => {
        setAdmin(adminData);
        localStorage.setItem('blitzit_admin', JSON.stringify(adminData));
    };

    const handleLogout = () => {
        setAdmin(null);
        localStorage.removeItem('blitzit_admin');
        localStorage.removeItem('admin_token');
    };

    // If not logged in, show Login Page
    if (!admin) {
        return <AdminLogin onLogin={handleLogin} />;
    }

    // If logged in, show Dashboard
    return <AdminDashboard admin={admin} onLogout={handleLogout} />;
};

export default AdminApp;
