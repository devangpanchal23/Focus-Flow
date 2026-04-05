import React, { useState, useEffect } from 'react';
import {
    Users,
    Search,
    Trash2,
    LogOut,
    LayoutDashboard,
    RefreshCw,
    CheckCircle2,
    XCircle,
    MoreVertical,
    Menu,
    TrendingUp,
    ShieldBan,
    ShieldAlert,
    Activity,
    Bell,
    CheckSquare,
    DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import PaymentsDashboard from './PaymentsDashboard';

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-600 transition-all">
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
            <Icon className="w-24 h-24" />
        </div>
        <div className="relative z-10">
            <div className={`p-3 rounded-xl w-fit mb-4 ${color.replace('text-', 'bg-').replace('500', '500/20')} ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
            <p className="text-slate-400 font-medium mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
        </div>
    </div>
);

const UserRow = ({ user, onDelete, onStatusChange }) => (
    <tr className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors group ${user.status === 'pending' ? 'bg-yellow-500/5' : ''}`}>
        <td className="py-4 px-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-600">
                    {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-lg font-bold text-slate-400">
                            {(user.displayName || user.email || 'U')[0].toUpperCase()}
                        </span>
                    )}
                </div>
                <div>
                    <h4 className="font-semibold text-white">{user.displayName || 'Unnamed User'}</h4>
                    <p className="text-sm text-slate-400">{user.email}</p>
                </div>
            </div>
        </td>
        <td className="py-4 px-6">
            <span className="text-slate-300 font-medium">
                {user.role.toUpperCase()}
            </span>
        </td>
        <td className="py-4 px-6">
            <div className="flex flex-col gap-1">
                {user.status === 'pending' && <span className="inline-flex items-center w-fit px-2 py-1 rounded text-xs font-semibold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">Pending</span>}
                {user.status === 'accepted' && <span className="inline-flex items-center w-fit px-2 py-1 rounded text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">Accepted</span>}
                {user.status === 'declined' && <span className="inline-flex items-center w-fit px-2 py-1 rounded text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">Declined</span>}
            </div>
        </td>
        <td className="py-4 px-6 text-right space-x-2">
            {user.status === 'pending' && (
                <>
                    <button
                        onClick={() => onStatusChange(user.userId, 'approve')}
                        className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 transition-colors text-xs font-medium"
                    >
                        Approve
                    </button>
                    <button
                        onClick={() => onStatusChange(user.userId, 'decline')}
                        className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-colors text-xs font-medium"
                    >
                        Decline
                    </button>
                </>
            )}
            <button
                onClick={() => onDelete(user.userId)}
                className="p-2 inline-flex text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Delete User & Data"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </td>
    </tr>
);

const AdminDashboard = ({ admin, onLogout }) => {
    const [users, setUsers] = useState([]);
    const [upgradeRequests, setUpgradeRequests] = useState([]);
    const [taskLeaderboard, setTaskLeaderboard] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [activeSection, setActiveSection] = useState('dashboard'); // Default to dashboard
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Initial Fetch & Polling
    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            onLogout();
            return;
        }

        const fetchData = async () => {
            try {
                // Fetch Stats
                const statsRes = await fetch('/api/admin/stats', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (statsRes.ok) {
                    setStats(await statsRes.json());
                }

                // Fetch Users
                let userUrl = '/api/admin/users';
                const queryParams = [];
                if (searchTerm) queryParams.push(`search=${searchTerm}`);
                if (statusFilter) queryParams.push(`status=${statusFilter}`);
                if (queryParams.length > 0) userUrl += `?${queryParams.join('&')}`;

                const usersRes = await fetch(userUrl, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (usersRes.ok) {
                    const data = await usersRes.json();
                    setUsers(data.users || []);
                }

                // Fetch Upgrade Requests
                const upgradeRes = await fetch('/api/admin/upgrade-requests', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (upgradeRes.ok) {
                    const data = await upgradeRes.json();
                    setUpgradeRequests(data.requests || []);
                }

                // Fetch Task Leaderboard (Top performers)
                const leaderboardRes = await fetch('/api/admin/analytics/top-task-performers?limit=3', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (leaderboardRes.ok) {
                    const data = await leaderboardRes.json();
                    setTaskLeaderboard(data.leaderboard || []);
                }
            } catch (error) {
                console.error("Failed to fetch admin data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 15000); // 15 seconds polling
        return () => clearInterval(interval);
    }, [refreshTrigger, searchTerm, statusFilter, onLogout]);

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure? This will delete all user data permanently.')) return;
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setUsers(users.filter(u => u.userId !== userId));
            } else {
                alert('Failed to delete user');
            }
        } catch (error) {
            alert('Error deleting user');
        }
    };

    const handleUserStatusChange = async (userId, action) => {
        try {
            const token = localStorage.getItem('admin_token');
            // action is 'approve', 'decline', 'block', 'unblock'
            const res = await fetch(`/api/admin/users/${userId}/${action}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setRefreshTrigger(prev => prev + 1); // trigger refresh
            } else {
                alert(`Error: Failed to ${action} user.`);
            }
        } catch (error) {
            alert(`Error trying to ${action} user`);
        }
    };

    const handleUpgradeAction = async (requestId, action) => {
        try {
            const token = localStorage.getItem('admin_token');
            // action is 'approve' or 'reject'
            const res = await fetch(`/api/admin/upgrade-requests/${requestId}/${action}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setRefreshTrigger(prev => prev + 1);
            } else {
                const err = await res.json();
                alert(`Error: ${err.message}`);
            }
        } catch (error) {
            alert('Error processing upgrade request');
        }
    };

    const handleToggleBlock = async (userId, currentlyBlocked) => {
        try {
            const token = localStorage.getItem('admin_token');
            const action = currentlyBlocked ? 'unblock' : 'block';
            const res = await fetch(`/api/admin/users/${userId}/${action}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setUsers(users.map(u => u.userId === userId ? { ...u, isBlocked: !currentlyBlocked } : u));
            }
        } catch (error) {
            alert('Error toggling block state');
        }
    };

    const filteredUsers = users; // Filtering is now handled on the backend via query params

    return (
        <div className="flex h-screen bg-slate-900 overflow-hidden font-sans">
            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 bg-slate-900 border-r border-slate-800 flex flex-col z-50 w-64 transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg">
                            <LayoutDashboard className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Admin</h1>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <button
                        onClick={() => { setActiveSection('users'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === 'users' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <Users className="w-5 h-5" />
                        User Management
                    </button>
                    <button
                        onClick={() => { setActiveSection('upgradeRequests'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === 'upgradeRequests' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <ShieldAlert className="w-5 h-5" />
                        Upgrade Requests
                        {upgradeRequests.filter(req => req.status === 'pending').length > 0 && (
                            <span className="ml-auto bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
                                {upgradeRequests.filter(req => req.status === 'pending').length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => { setActiveSection('analytics'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === 'analytics' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <TrendingUp className="w-5 h-5" />
                        Analytics & Scores
                    </button>
                    <button
                        onClick={() => { setActiveSection('payments'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === 'payments' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <DollarSign className="w-5 h-5" />
                        Payments
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-slate-800/50">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
                            A
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">Admin</p>
                            <p className="text-xs text-slate-500 truncate">{admin?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:border hover:border-red-500/20 transition-all font-medium"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full relative overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute top-0 left-0 w-full h-full bg-slate-900 z-0" />
                <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[100px] z-0" />
                <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] z-0" />

                <div className="relative z-10 flex flex-col h-full">
                    {/* Header */}
                    <header className="h-20 border-b border-slate-800/50 flex items-center justify-between px-4 md:px-8 backdrop-blur-md bg-slate-900/50">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                            <h2 className="text-xl md:text-2xl font-bold text-white">User Management</h2>
                        </div>

                        <div className="flex items-center gap-2 md:gap-4">
                            <div className="relative hidden md:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-full pl-10 pr-4 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                />
                            </div>
                            <button
                                onClick={() => setRefreshTrigger(prev => prev + 1)}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
                                title="Refresh Data"
                            >
                                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </header>

                    {/* Mobile Search Bar (Visible only on mobile) */}
                    <div className="md:hidden px-4 py-3 border-b border-slate-800/50 bg-slate-900/50">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-full pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                            />
                        </div>
                    </div>

                    {/* Dashboard Content */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8">
                        {activeSection === 'users' ? (
                            <>
                                {/* Stats Row */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <StatCard
                                        title="Total Users"
                                        value={users.length}
                                        icon={Users}
                                        color="text-purple-500"
                                    />
                                    <StatCard
                                        title="Active Today"
                                        value={users.filter(u => new Date(u.createdAt).getDate() === new Date().getDate()).length}
                                        icon={CheckCircle2}
                                        color="text-green-500"
                                    />
                                    <StatCard
                                        title="Notion Connected"
                                        value={users.filter(u => u.notionConfig?.isConnected).length}
                                        icon={LayoutDashboard}
                                        color="text-blue-500"
                                    />
                                </div>

                                {/* Users Table */}
                                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left min-w-[600px]">
                                            <thead>
                                                <tr className="border-b border-slate-700/50 bg-slate-800/80">
                                                    <th className="py-4 px-6 font-semibold text-slate-300">User</th>
                                                    <th className="py-4 px-6 font-semibold text-slate-300">Role</th>
                                                    <th className="py-4 px-6 font-semibold text-slate-300">Status</th>
                                                    <th className="py-4 px-6 font-semibold text-slate-300 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-700/50">
                                                {filteredUsers.length > 0 ? (
                                                    filteredUsers.map(user => (
                                                        <UserRow key={user.userId} user={user} onDelete={handleDeleteUser} onStatusChange={handleUserStatusChange} />
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="4" className="py-12 text-center text-slate-500">
                                                            {loading ? 'Loading users...' : 'No users found.'}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        ) : activeSection === 'upgradeRequests' ? (
                            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
                                <div className="p-6 border-b border-slate-700/50 flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-white">Upgrade Requests</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left min-w-[600px]">
                                        <thead>
                                            <tr className="border-b border-slate-700/50 bg-slate-800/80">
                                                <th className="py-4 px-6 font-semibold text-slate-300">User</th>
                                                <th className="py-4 px-6 font-semibold text-slate-300">Requested Role</th>
                                                <th className="py-4 px-6 font-semibold text-slate-300">Status</th>
                                                <th className="py-4 px-6 font-semibold text-slate-300">Request Date</th>
                                                <th className="py-4 px-6 font-semibold text-slate-300 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700/50">
                                            {upgradeRequests.length > 0 ? (
                                                upgradeRequests.map(req => (
                                                    <tr key={req._id} className="hover:bg-slate-700/30 transition-colors">
                                                        <td className="py-4 px-6">
                                                            <div className="font-medium text-white">{req.userId?.displayName || 'Unknown User'}</div>
                                                            <div className="text-sm text-slate-400">{req.userId?.email}</div>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                                {req.requestedRole?.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            {req.status === 'pending' && <span className="text-yellow-500 text-sm font-medium">Pending</span>}
                                                            {req.status === 'approved' && <span className="text-green-500 text-sm font-medium">Approved</span>}
                                                            {req.status === 'rejected' && <span className="text-red-500 text-sm font-medium">Rejected</span>}
                                                        </td>
                                                        <td className="py-4 px-6 text-sm text-slate-300">
                                                            {format(new Date(req.createdAt), 'MMM d, yyyy h:mm a')}
                                                        </td>
                                                        <td className="py-4 px-6 text-right space-x-2">
                                                            {req.status === 'pending' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleUpgradeAction(req._id, 'approve')}
                                                                        className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 transition-colors text-xs font-medium"
                                                                    >
                                                                        Approve
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleUpgradeAction(req._id, 'reject')}
                                                                        className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-colors text-xs font-medium"
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                </>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="py-12 text-center text-slate-500">
                                                        No upgrade requests found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : activeSection === 'analytics' ? (
                            <div className="space-y-6">
                                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-xl font-bold text-white">Task Performance Leaderboard</h3>
                                            <p className="text-slate-400 text-sm">Top 3 users by completed tasks</p>
                                        </div>
                                    </div>

                                    {taskLeaderboard.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {taskLeaderboard.map((row, idx) => {
                                                const place = idx + 1;
                                                const label = place === 1 ? '1st' : place === 2 ? '2nd' : '3rd';
                                                const user = row.user;
                                                const name = user?.displayName || user?.email || 'Unknown User';
                                                const email = user?.email || '';
                                                const completionRate = Math.round((row.completionRate || 0) * 100);

                                                return (
                                                    <div
                                                        key={row.userId || idx}
                                                        className={`rounded-2xl border border-slate-700/50 bg-slate-900/30 p-5 hover:border-slate-600 transition-all ${place === 1 ? 'ring-1 ring-yellow-500/30' : place === 2 ? 'ring-1 ring-slate-400/20' : 'ring-1 ring-amber-700/20'
                                                            }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${place === 1
                                                                        ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                                        : place === 2
                                                                            ? 'bg-slate-400/10 text-slate-300 border-slate-400/20'
                                                                            : 'bg-amber-600/10 text-amber-300 border-amber-600/20'
                                                                        }`}>
                                                                        {label}
                                                                    </span>
                                                                    <p className="font-semibold text-white truncate">{name}</p>
                                                                </div>
                                                                {email && <p className="text-xs text-slate-400 truncate mt-1">{email}</p>}
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xs text-slate-400">Completion</p>
                                                                <p className="text-lg font-bold text-white">{completionRate}%</p>
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 grid grid-cols-2 gap-3">
                                                            <div className="rounded-xl bg-slate-800/40 border border-slate-700/40 p-3">
                                                                <p className="text-xs text-slate-400">Created</p>
                                                                <p className="text-xl font-bold text-white">{row.tasksCreated}</p>
                                                            </div>
                                                            <div className="rounded-xl bg-slate-800/40 border border-slate-700/40 p-3">
                                                                <p className="text-xs text-slate-400">Completed</p>
                                                                <p className="text-xl font-bold text-emerald-400">{row.tasksCompleted}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-slate-500 bg-slate-800/30 rounded-xl border border-slate-700/30 border-dashed">
                                            <div className="bg-slate-700/50 p-4 rounded-full w-fit mx-auto mb-3">
                                                <TrendingUp className="w-8 h-8 text-slate-400" />
                                            </div>
                                            <p className="font-medium text-slate-400">No leaderboard data yet.</p>
                                            <p className="text-sm mt-1">Once users create and complete tasks, top performers will appear here.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}
                        {activeSection === 'logs' && (
                            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
                                <h3 className="text-xl font-bold text-white mb-6">System Activity Logs</h3>
                                <div className="text-center py-12 text-slate-500 bg-slate-800/30 rounded-xl border border-slate-700/30 border-dashed">
                                    <div className="bg-slate-700/50 p-4 rounded-full w-fit mx-auto mb-3">
                                        <Activity className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <p className="font-medium text-slate-400">Activity stream connected.</p>
                                    <p className="text-sm mt-1">Logs are generating in the backend.</p>
                                </div>
                            </div>
                        )}
                        {activeSection === 'notifications' && (
                            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
                                <h3 className="text-xl font-bold text-white mb-6">Broadcast Notifications</h3>
                                <form className="space-y-4 max-w-xl" onSubmit={async (e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.target);
                                    try {
                                        const token = localStorage.getItem('admin_token');
                                        const res = await fetch('/api/admin/notifications', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                            body: JSON.stringify({
                                                title: formData.get('title'),
                                                message: formData.get('message'),
                                                recipientType: 'ALL'
                                            })
                                        });
                                        if (res.ok) {
                                            alert('Broadcast sent!');
                                            e.target.reset();
                                        }
                                    } catch (err) {
                                        alert('Error sending broadcast');
                                    }
                                }}>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                                        <input name="title" required className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500/50 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Message</label>
                                        <textarea name="message" required rows={4} className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500/50 outline-none" />
                                    </div>
                                    <button type="submit" className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors">
                                        Send to All Users
                                    </button>
                                </form>
                            </div>
                        )}
                        {activeSection === 'payments' && (
                            <PaymentsDashboard />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
