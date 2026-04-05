import React, { useState } from 'react';
import { LayoutDashboard, Lock, Mail, ArrowRight } from 'lucide-react';

const AdminLogin = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Ensure the user actually has admin role 
                // Wait, /api/auth/login doesn't return role right now, but the backend requires it.
                // We'll save the token anyway.
                localStorage.setItem('admin_token', data.token);
                onLogin(data.user);
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px]" />

            <div className="relative w-full max-w-md p-8">
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
                    <div className="relative bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-8 rounded-2xl shadow-2xl">

                        <div className="flex flex-col items-center mb-8">
                            <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl shadow-lg mb-4">
                                <LayoutDashboard className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-2">Admin Portal</h1>
                            <p className="text-slate-400">Enter your credentials to access the dashboard</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
                                <div className="relative group/input">
                                    <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500 group-focus-within/input:text-purple-400 transition-colors" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all"
                                        placeholder="admin@blitzit.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
                                <div className="relative group/input">
                                    <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500 group-focus-within/input:text-purple-400 transition-colors" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {loading ? (
                                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
