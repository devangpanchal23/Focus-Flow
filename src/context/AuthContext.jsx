import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const API_URL = '/api/auth';

    useEffect(() => {
        const verifySession = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const response = await fetch(`${API_URL}/me`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        setCurrentUser(data.user);
                    } else {
                        localStorage.removeItem('token');
                        setCurrentUser(null);
                    }
                } catch (error) {
                    console.error("Token verification failed:", error);
                    localStorage.removeItem('token');
                    setCurrentUser(null);
                }
            }
            setLoading(false);
        };
        verifySession();
    }, []);

    const login = async (email, password) => {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        localStorage.setItem('token', data.token);
        setCurrentUser(data.user);
        return data;
    };

    const signup = async (email, password, name) => {
        const response = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Signup failed');
        }

        // Token is no longer returned on signup to enforce Admin Approval flow.
        // We throw a special error-like object or return the message to be shown on the UI.
        return data.message;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setCurrentUser(null);
    };

    const forgotPassword = async (email, newPassword) => {
        const response = await fetch(`${API_URL}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, newPassword })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Password reset failed');
        }
        return data.message;
    };

    const value = {
        currentUser,
        login,
        signup,
        forgotPassword,
        logout,
        setCurrentUser
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
