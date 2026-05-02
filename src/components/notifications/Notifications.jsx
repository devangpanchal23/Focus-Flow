import React, { useState, useEffect, useMemo } from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';

export default function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await fetch('/api/notifications', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    setNotifications(await res.json());
                    setError(null);
                }
            } catch (err) {
                console.error("Failed to fetch notifications", err);
                setError('Failed to load notifications.');
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, []);

    const unreadCount = useMemo(
        () => notifications.filter((n) => n.status === 'UNREAD').length,
        [notifications]
    );

    useEffect(() => {
        window.dispatchEvent(new CustomEvent('notifications_updated', { detail: { unreadCount } }));
    }, [unreadCount]);

    const refresh = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await fetch('/api/notifications', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setNotifications(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    const markAsRead = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/notifications/${id}/read`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const updated = await res.json();
                setNotifications((prev) => prev.map((n) => (n._id === id ? updated : n)));
            }
        } catch (err) {
            console.error("Error marking read", err);
        }
    };

    const markAllAsRead = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/notifications/read-all', {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                await refresh();
            }
        } catch (err) {
            console.error("Error marking all read", err);
        }
    };

    return (
        <div className="h-full flex flex-col p-6 max-w-4xl mx-auto">
            <header className="mb-8 flex items-center gap-3">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                    <Bell className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold bg-slate-900 text-transparent bg-clip-text dark:text-white">
                        Notifications
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Updates and alerts from the system</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="px-3 py-2 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                            Mark all as read
                        </button>
                    )}
                    <span className="text-sm font-semibold text-slate-600">
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                    </span>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {loading ? (
                    <div className="text-center py-12 text-slate-500">Loading notifications...</div>
                ) : error ? (
                    <div className="text-center py-12 text-slate-500">{error}</div>
                ) : notifications.length > 0 ? (
                    notifications.map(n => (
                        <div
                            key={n._id}
                            className={`p-5 rounded-2xl border transition-all ${n.status !== 'UNREAD'
                                ? 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                                : 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-500/30'
                                }`}
                        >
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <h3 className={`font-semibold ${n.status !== 'UNREAD' ? 'text-slate-700 dark:text-slate-300' : 'text-indigo-900 dark:text-indigo-300'}`}>
                                        {n.title}
                                    </h3>
                                    <p className={`mt-1 text-sm ${n.status !== 'UNREAD' ? 'text-slate-500 dark:text-slate-400' : 'text-indigo-700 dark:text-indigo-400'}`}>
                                        {n.message}
                                    </p>
                                    <span className="text-xs text-slate-400 mt-3 block">
                                        {new Date(n.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                {n.status === 'UNREAD' && (
                                    <button 
                                        onClick={() => markAsRead(n._id)}
                                        className="p-2 text-indigo-500 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                                        title="Mark as Read"
                                    >
                                        <CheckCircle2 className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-24 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">You're all caught up!</h3>
                        <p className="text-slate-500 dark:text-slate-400">No new notifications.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
