import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, CheckCircle2, ShieldCheck, Zap, Mail, Lock, User, Loader2 } from 'lucide-react';

export default function AuthPage() {
    const { login, signup, forgotPassword } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Form fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        try {
            if (isForgotPassword) {
                const message = await forgotPassword(email, password);
                setSuccessMessage(message);
                setIsForgotPassword(false);
                setEmail('');
                setPassword('');
            } else if (isLogin) {
                await login(email, password);
            } else {
                const message = await signup(email, password, name);
                setSuccessMessage(message);
                setIsLogin(true); // Switch to login view so they can try later
                setEmail('');
                setPassword('');
                setName('');
            }
        } catch (err) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[120px] pointer-events-none" />

            <div className="flex flex-col md:flex-row w-full max-w-5xl bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden z-10 min-h-[600px]">

                {/* Left Side: Brand & Value Prop */}
                <div className="hidden md:flex flex-1 p-12 flex-col justify-between relative border-r border-slate-700/50">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />

                    <div className="z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="bg-indigo-500 p-2 rounded-xl text-white">
                                <Zap size={28} fill="currentColor" />
                            </div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">FocusFlow</h1>
                        </div>

                        <h2 className="text-4xl lg:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 mb-6 leading-tight">
                            Master Your Flow State.
                        </h2>
                        <p className="text-slate-400 text-lg leading-relaxed mb-8">
                            Experience the ultimate productivity workspace. Organize tasks, focus deeply with our timer, and track your progress in your own private space.
                        </p>
                    </div>

                    <div className="space-y-4 z-10">
                        {[
                            "Private, secure workspace for your data",
                            "Advanced Focus Timer with analytics",
                            "Eisenhower Matrix task prioritization",
                            "Sync across devices instantly"
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 text-slate-300">
                                <CheckCircle2 className="text-indigo-400" size={20} />
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Side: Login/Signup Action */}
                <div className="flex-1 bg-slate-800/50 p-8 md:p-12 flex flex-col justify-center items-center relative">
                    <div className="w-full max-w-sm">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-700/50 mb-6 border border-slate-600 shadow-inner">
                                <ShieldCheck className="text-emerald-400" size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">
                                {isForgotPassword ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Create an Account'}
                            </h3>
                            <p className="text-slate-400">
                                {isForgotPassword ? 'Enter your email and a new password' : isLogin ? 'Sign in to access your dashboard' : 'Sign up to start your journey'}
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}
                        
                        {successMessage && (
                            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-xl text-green-400 text-sm text-center">
                                {successMessage}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {!isLogin && !isForgotPassword && (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-300 ml-1">Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <User size={18} className="text-slate-500" />
                                        </div>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                            placeholder="Your full name"
                                            required={!isLogin}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-300 ml-1">Email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail size={18} className="text-slate-500" />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                        placeholder="you@example.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-sm font-medium text-slate-300">
                                        {isForgotPassword ? 'New Password' : 'Password'}
                                    </label>
                                    {isLogin && !isForgotPassword && (
                                        <button 
                                            type="button" 
                                            onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMessage(''); }}
                                            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors focus:outline-none"
                                        >
                                            Forgot Password?
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock size={18} className="text-slate-500" />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full relative flex flex-row items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-indigo-500/25 mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading && <Loader2 size={20} className="animate-spin" />}
                                <span>{isForgotPassword ? 'Reset Password' : isLogin ? 'Sign In' : 'Sign Up'}</span>
                            </button>
                        </form>

                        <div className="mt-8 text-center text-slate-400 text-sm">
                            {isForgotPassword ? (
                                <button 
                                    type="button" 
                                    onClick={() => { setIsForgotPassword(false); setError(''); setSuccessMessage(''); }} 
                                    className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors focus:outline-none"
                                >
                                    Back to Sign In
                                </button>
                            ) : (
                                <>
                                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                                    <button 
                                        type="button" 
                                        onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMessage(''); }} 
                                        className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors focus:outline-none"
                                    >
                                        {isLogin ? 'Sign up' : 'Sign in'}
                                    </button>
                                </>
                            )}
                        </div>

                        <p className="text-center text-slate-500 text-xs mt-8">
                            All your data is ENCRYPTED and PRIVATE.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
