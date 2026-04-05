import React, { useState } from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
    // In a real app we might lift activeTab state up or use a router
    // For this SPA without router, we'll manage it here or pass props
    // But actually handling 'activeTab' needs to be at the App level to switch content
    // So Layout will just be the shell.

    return (
        <div className="flex h-screen bg-slate-50">
            {children}
        </div>
    );
}
