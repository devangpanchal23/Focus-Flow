import React, { useState, useEffect, useMemo } from 'react';
import {
    LayoutDashboard,
    CheckSquare,
    Timer,
    BarChart3,
    Settings,
    Menu,
    X,
    ChevronLeft,
    ChevronRight,
    Shield,
    Calendar,
    Activity,
    ArrowUpDown,
    ChevronUp,
    ChevronDown,
    BookOpen,
    Bell
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth, useUser } from '@clerk/clerk-react';
import { createDebounced, patchUserState } from '../utils/userStateSync';
import { readUiSnapshot } from '../utils/readUiSnapshot';

const DEFAULT_NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'habit-tracker', label: 'Habit Tracker', icon: Activity },
    { id: 'journal', label: 'Journal', icon: BookOpen },
    { id: 'focus', label: 'Focus Mode', icon: Timer },
    { id: 'web-block', label: 'Web Block', icon: Shield },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

function orderIdsToNavItems(orderIds) {
    if (!Array.isArray(orderIds) || orderIds.length !== DEFAULT_NAV_ITEMS.length)
        return null;
    const reordered = orderIds
        .map((id) => DEFAULT_NAV_ITEMS.find((item) => item.id === id))
        .filter(Boolean);
    return reordered.length === DEFAULT_NAV_ITEMS.length ? reordered : null;
}

export default function Sidebar({ activeTab, setActiveTab, effectiveRole: roleFromBackend }) {
    const { user: currentUser } = useUser();
    const { getToken } = useAuth();

    const debouncedSaveSidebarOrder = useMemo(
        () =>
            createDebounced((orderIds) => {
                patchUserState(getToken, { uiState: { sidebarOrder: orderIds } });
            }, 900),
        [getToken]
    );
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isRearranging, setIsRearranging] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const publicMetadata = currentUser?.publicMetadata || {};
    let fromMetadata = publicMetadata.role || 'normal';
    if (fromMetadata === 'normal') {
        if (publicMetadata.hasFullAccess || publicMetadata.planType === 'full') fromMetadata = 'full';
        else if (publicMetadata.hasPro || publicMetadata.planType === 'pro') fromMetadata = 'pro';
    }
    const userRole = roleFromBackend || fromMetadata;

    const roleToNav = {
        normal: ['dashboard', 'tasks', 'focus'],
        pro: ['dashboard', 'tasks', 'focus', 'calendar', 'web-block'],
        full: DEFAULT_NAV_ITEMS.map(i => i.id),
        admin: DEFAULT_NAV_ITEMS.map(i => i.id),
        moderator: DEFAULT_NAV_ITEMS.map(i => i.id)
    };

    const allowedIds = roleToNav[userRole] || roleToNav.normal;

    // Fetch Notifications unread count (server is source of truth)
    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setUnreadCount(0);
                    return;
                }
                const res = await fetch('/api/notifications?status=UNREAD', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setUnreadCount(Array.isArray(data) ? data.length : 0);
                }
            } catch (err) {
                console.error("Failed to fetch notifications", err);
            }
        };

        const onNotificationsUpdated = (e) => {
            const count = e?.detail?.unreadCount;
            if (typeof count === 'number') setUnreadCount(count);
            else fetchUnreadCount();
        };

        fetchUnreadCount();
        window.addEventListener('notifications_updated', onNotificationsUpdated);
        const intv = setInterval(fetchUnreadCount, 60000); // 1 minute polling
        return () => {
            window.removeEventListener('notifications_updated', onNotificationsUpdated);
            clearInterval(intv);
        };
    }, []);

    // Initialize items from Mongo snapshot → localStorage → default
    const [navItems, setNavItems] = useState(() => {
        try {
            const fromMongoIds = readUiSnapshot()?.uiState?.sidebarOrder;
            const fromMongoItems = orderIdsToNavItems(fromMongoIds);
            if (fromMongoItems) return fromMongoItems;

            const savedOrder = localStorage.getItem('sidebarOrder');
            if (savedOrder) {
                const savedIds = JSON.parse(savedOrder);
                const fromLs = orderIdsToNavItems(savedIds);
                if (fromLs) return fromLs;
            }
        } catch (error) {
            console.error('Failed to load sidebar order', error);
        }
        return DEFAULT_NAV_ITEMS;
    });

    useEffect(() => {
        const onHydrate = (e) => {
            const orderIds = e.detail?.uiState?.sidebarOrder;
            const ordered = orderIdsToNavItems(orderIds);
            if (!ordered) return;
            setNavItems(ordered);
            localStorage.setItem('sidebarOrder', JSON.stringify(orderIds));
        };
        window.addEventListener('user_ui_hydrate', onHydrate);
        return () => window.removeEventListener('user_ui_hydrate', onHydrate);
    }, []);

    const visibleNavItems = navItems.filter(i => allowedIds.includes(i.id));

    const handleMove = (index, direction, e) => {
        e.stopPropagation(); // Prevent navigation click
        const newItems = [...navItems];

        // index is relative to visibleNavItems; translate to real indices in newItems
        const currentVisible = visibleNavItems[index];
        const targetVisible = visibleNavItems[direction === 'up' ? index - 1 : index + 1];
        if (!currentVisible || !targetVisible) return;

        const currentIndex = newItems.findIndex(i => i.id === currentVisible.id);
        const targetIndex = newItems.findIndex(i => i.id === targetVisible.id);
        if (currentIndex === -1 || targetIndex === -1) return;

        [newItems[currentIndex], newItems[targetIndex]] = [newItems[targetIndex], newItems[currentIndex]];

        setNavItems(newItems);
        // Persist order
        const orderIds = newItems.map(item => item.id);
        localStorage.setItem('sidebarOrder', JSON.stringify(orderIds));
        debouncedSaveSidebarOrder(orderIds);
    };

    return (
        <>
            {/* Mobile Menu Button - Only visible on small screens */}
            <button
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md hover:bg-slate-50 text-slate-600"
                onClick={() => setMobileOpen(true)}
            >
                <Menu size={24} />
            </button>

            {/* Overlay for mobile */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={cn(
                    "fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col",
                    collapsed ? "w-20" : "w-64",
                    mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Header */}
                <div className={cn(
                    "h-16 flex items-center border-b border-slate-100",
                    collapsed ? "justify-center" : "justify-between px-6"
                )}>
                    {!collapsed && (
                        <span className="font-outfit font-bold text-xl text-indigo-600 tracking-tight">
                            FocusFlow
                        </span>
                    )}
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="lg:hidden text-slate-400 hover:text-slate-600"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-6 space-y-2 px-3 overflow-y-auto custom-scrollbar">
                    {visibleNavItems.map((item, index) => (
                        <div key={item.id} className="relative group">
                            <button
                                onClick={() => {
                                    if (!isRearranging) {
                                        setActiveTab(item.id);
                                        setMobileOpen(false);
                                    }
                                }}
                                className={cn(
                                    "w-full flex items-center p-3 rounded-xl transition-all duration-200 relative",
                                    activeTab === item.id
                                        ? "bg-indigo-50 text-indigo-600 shadow-sm"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                                    isRearranging && "cursor-move border-2 border-dashed border-slate-200 hover:border-indigo-300 bg-slate-50/50"
                                )}
                            >
                                <item.icon size={24} strokeWidth={activeTab === item.id ? 2.5 : 2} className="shrink-0" />

                                {!collapsed && (
                                    <span className="ml-3 font-medium text-sm whitespace-nowrap overflow-hidden">
                                        {item.label}
                                    </span>
                                )}

                                {/* Tooltip for collapsed mode */}
                                {collapsed && !isRearranging && (
                                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                                        {item.label}
                                    </div>
                                )}
                            </button>

                            {/* Rearrange Controls */}
                            {isRearranging && !collapsed && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                                    <button
                                        onClick={(e) => handleMove(index, 'up', e)}
                                        disabled={index === 0}
                                        className="p-0.5 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                    >
                                        <ChevronUp size={12} />
                                    </button>
                                    <button
                                        onClick={(e) => handleMove(index, 'down', e)}
                                        disabled={index === visibleNavItems.length - 1}
                                        className="p-0.5 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                    >
                                        <ChevronDown size={12} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                {/* Footer / Toggle */}
                <div className="p-4 border-t border-slate-100 bg-white space-y-2">
                    {/* Rearrange Toggle */}
                    <button
                        onClick={() => {
                            setIsRearranging(!isRearranging);
                            if (collapsed) setCollapsed(false); // Auto-expand to show controls
                        }}
                        className={cn(
                            "w-full flex items-center p-2 rounded-lg transition-all duration-200 text-xs font-medium justify-center gap-2",
                            isRearranging
                                ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500 ring-offset-2"
                                : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                        )}
                        title="Rearrange Menu Items"
                    >
                        <ArrowUpDown size={16} />
                        {!collapsed && (isRearranging ? "Done Arranging" : "Rearrange Menu")}
                    </button>

                    <div className="h-px bg-slate-100 my-2" />

                    <button
                        onClick={() => activeTab !== 'notifications' && setActiveTab('notifications')}
                        className={cn(
                            "w-full flex items-center p-3 rounded-xl transition-all duration-200 relative",
                            activeTab === 'notifications'
                                ? "bg-indigo-50 text-indigo-600"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        )}
                    >
                        <Bell size={24} className="shrink-0" />
                        {!collapsed && <span className="ml-3 font-medium text-sm">Notifications</span>}
                        {unreadCount > 0 && (
                            <span className={cn(
                                "absolute flex items-center justify-center bg-red-500 text-white font-bold rounded-full",
                                collapsed ? "w-4 h-4 text-[10px] top-2 right-2" : "px-2 py-0.5 text-xs right-3"
                            )}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => activeTab !== 'settings' && setActiveTab('settings')}
                        className={cn(
                            "w-full flex items-center p-3 rounded-xl transition-all duration-200",
                            activeTab === 'settings'
                                ? "bg-indigo-50 text-indigo-600"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        )}
                    >
                        <Settings size={24} className="shrink-0" />
                        {!collapsed && <span className="ml-3 font-medium text-sm">Settings</span>}
                    </button>

                    <button
                        onClick={() => {
                            setCollapsed(!collapsed);
                            setIsRearranging(false); // Exit arrange mode if collapsing
                        }}
                        className="hidden lg:flex w-full items-center justify-center p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                        {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>
                </div>
            </aside>
        </>
    );
}
