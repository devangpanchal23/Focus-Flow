import React, { useState } from 'react';
import { Zap, ShieldAlert, CopyCheck } from 'lucide-react';
import { useUser, useAuth } from '@clerk/clerk-react';

export default function AccessRequestCard() {
    const { user: currentUser } = useUser();
    const { getToken } = useAuth();
    const [requesting, setRequesting] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const publicMetadata = currentUser?.publicMetadata || {};
    const userRole = publicMetadata.role || 'normal';
    const canRequestPro = userRole === 'normal';
    const canRequestFull = userRole === 'normal' || userRole === 'pro';

    const requestUpgrade = async (requestedRole) => {
        try {
            setRequesting(true);
            setMessage('');
            setError('');

            const token = await getToken();
            const res = await fetch('/api/upgrade/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ requestedRole })
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.message || 'Failed to send request.');
                return;
            }

            setMessage(data.message || 'Request sent to admin for approval.');
        } catch (e) {
            setError('Network error occurred.');
        } finally {
            setRequesting(false);
        }
    };

    if (userRole === 'full' || userRole === 'admin' || userRole === 'moderator') {
        return null;
    }

    return (
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Zap size={20} className="text-indigo-500" />
                    Request Feature Access
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                    Your current plan is <span className="font-semibold">{userRole.toUpperCase()}</span>. Request an upgrade for additional features.
                </p>
            </div>

            <div className="p-6 space-y-4">
                {message && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-xl text-sm">
                        <CopyCheck className="w-5 h-5" />
                        {message}
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
                        <ShieldAlert className="w-5 h-5" />
                        {error}
                    </div>
                )}

                <div className="flex flex-col md:flex-row gap-3">
                    <button
                        disabled={!canRequestPro || requesting}
                        onClick={() => requestUpgrade('pro')}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {requesting ? 'Requesting...' : 'Request PRO'}
                        <Zap className="w-4 h-4" />
                    </button>

                    <button
                        disabled={!canRequestFull || requesting}
                        onClick={() => requestUpgrade('full')}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {requesting ? 'Requesting...' : 'Request FULL'}
                        <Zap className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </section>
    );
}

