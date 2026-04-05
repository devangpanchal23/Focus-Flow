import React, { useState, useEffect } from 'react';
import Sidebar from './layout/Sidebar';
import { useSettingsStore } from './store/useSettingsStore';
import { useTaskStore } from './store/useTaskStore';
import { useHabitStore } from './store/useHabitStore';
import { useNoteStore } from './store/useNoteStore';
import { useJournalStore } from './store/useJournalStore';

import Dashboard from './components/dashboard/Dashboard';
import Tasks from './components/tasks/Tasks';
import Focus from './components/timer/Focus';
import WebBlock from './components/web-block/WebBlock';
// Replaced Notion Calendar with native Calendar component
import Calendar from './components/calendar/BlitzCalendar.jsx';
import HabitTracker from './components/habit-tracker/HabitTracker';
import Journal from './components/journal/Journal';
import Analytics from './components/analytics/Analytics';
import Settings from './components/settings/Settings';
import Notifications from './components/notifications/Notifications';

import GlobalTimer from './components/GlobalTimer';

import AuthPage from './components/auth/AuthPage';
import { useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import PremiumFeatureWrapper from './components/common/PremiumFeatureWrapper.jsx';

function App() {
  const { currentUser } = useAuth();
  // Initialize activeTab from localStorage or default to 'dashboard'
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('blitzit_active_tab') || 'dashboard';
  });

  // Persist activeTab changes
  useEffect(() => {
    localStorage.setItem('blitzit_active_tab', activeTab);
  }, [activeTab]);

  const theme = useSettingsStore((state) => state.theme);
  const { fetchTasks, setAuthToken: setTaskAuthToken } = useTaskStore();
  const { fetchHabits, setAuthToken: setHabitAuthToken } = useHabitStore();
  const { fetchNotes, setAuthToken: setNoteAuthToken } = useNoteStore();
  const { fetchHistory: fetchJournalHistory, setAuthToken: setJournalAuthToken } = useJournalStore();

  useEffect(() => {
    if (currentUser) {
      const token = localStorage.getItem('token');
      if (token) {
        // Init Task Store
        setTaskAuthToken(token);
        fetchTasks();

        // Init Habit Store
        setHabitAuthToken(token);
        fetchHabits();

        // Init Note Store
        setNoteAuthToken(token);
        fetchNotes();

        // Init Journal Store
        setJournalAuthToken(token);
        fetchJournalHistory();
      }
    } else {
      // Reset stores on logout
      useTaskStore.setState({ tasks: [], activeTaskId: null, error: null, authToken: null });
      useHabitStore.setState({ habits: [], completions: {}, error: null, authToken: null });
      useNoteStore.setState({ notes: [], error: null, authToken: null });
      useJournalStore.setState({ entries: [], error: null, authToken: null });
    }
  }, [currentUser, fetchTasks, setTaskAuthToken, fetchHabits, setHabitAuthToken, fetchNotes, setNoteAuthToken, fetchJournalHistory, setJournalAuthToken]);

  if (!currentUser) {
    return <AuthPage />;
  }

  // Derive effective role based on privileges
  let effectiveRole = currentUser?.role || 'normal';
  if (effectiveRole === 'normal') {
    if (currentUser?.hasFullAccess) effectiveRole = 'full';
    else if (currentUser?.hasPro) effectiveRole = 'pro';
  }
  const userRole = effectiveRole;

  const roleToTabs = {
    normal: ['dashboard', 'tasks', 'focus', 'calendar', 'notifications', 'settings'],
    pro: ['dashboard', 'tasks', 'focus', 'calendar', 'web-block', 'notifications', 'settings'],
    full: ['dashboard', 'tasks', 'focus', 'calendar', 'web-block', 'habit-tracker', 'journal', 'analytics', 'notifications', 'settings'],
    admin: ['dashboard', 'tasks', 'focus', 'calendar', 'web-block', 'habit-tracker', 'journal', 'analytics', 'notifications', 'settings'],
    moderator: ['dashboard', 'tasks', 'focus', 'calendar', 'web-block', 'habit-tracker', 'journal', 'analytics', 'notifications', 'settings']
  };

  const allowedTabs = roleToTabs[userRole] || roleToTabs.normal;

  useEffect(() => {
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, allowedTabs]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const handleSettings = () => setActiveTab('settings');
    const handleDashboard = () => setActiveTab('dashboard');
    window.addEventListener('navigate_settings', handleSettings);
    window.addEventListener('navigate_dashboard', handleDashboard);
    return () => {
      window.removeEventListener('navigate_settings', handleSettings);
      window.removeEventListener('navigate_dashboard', handleDashboard);
    };
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'tasks': return <Tasks />;
      case 'habit-tracker':
        return (
          <PremiumFeatureWrapper feature="Habit Tracker" requiredRole="full">
            <HabitTracker />
          </PremiumFeatureWrapper>
        );
      case 'journal':
        return (
          <PremiumFeatureWrapper feature="Journal" requiredRole="full">
            <Journal />
          </PremiumFeatureWrapper>
        );
      case 'focus': return <Focus />;
      case 'web-block':
        return (
          <PremiumFeatureWrapper feature="Web Block" requiredRole="pro">
            <WebBlock />
          </PremiumFeatureWrapper>
        );
      case 'calendar':
        return (
          <PremiumFeatureWrapper feature="Calendar" requiredRole="pro">
            <Calendar />
          </PremiumFeatureWrapper>
        );
      case 'analytics':
        return (
          <PremiumFeatureWrapper feature="Analytics" requiredRole="full">
            <Analytics />
          </PremiumFeatureWrapper>
        );
      case 'notifications': return <Notifications />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div key={currentUser?.uid} className="flex h-screen bg-slate-50 transition-colors duration-300 dark:bg-slate-900">
      <GlobalTimer />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 overflow-y-auto h-full w-full pt-16 lg:pt-0">
        <div className="h-full">
          <ErrorBoundary>
            {renderContent()}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

export default App;
