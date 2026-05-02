import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignIn, SignUp, useUser, useAuth } from '@clerk/clerk-react';

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
import Calendar from './components/calendar/BlitzCalendar.jsx';
import HabitTracker from './components/habit-tracker/HabitTracker';
import Journal from './components/journal/Journal';
import Analytics from './components/analytics/Analytics';
import Settings from './components/settings/Settings';
import Notifications from './components/notifications/Notifications';

import GlobalTimer from './components/GlobalTimer';
import ErrorBoundary from './components/ErrorBoundary';
import PremiumFeatureWrapper from './components/common/PremiumFeatureWrapper.jsx';
import { getEffectiveRole } from './utils/accessControl';
import { logAppSession, patchUserState, createDebounced } from './utils/userStateSync';
import { useSyncSettingsToMongo } from './hooks/useSyncSettingsToMongo';
import { writeUiSnapshot, clearUiSnapshot } from './utils/readUiSnapshot';

/** Tabs that exist in routing / sidebar ids (premium gating clamps via userRole separately). */
const KNOWN_APP_TAB_IDS = new Set([
  'dashboard',
  'tasks',
  'focus',
  'calendar',
  'web-block',
  'habit-tracker',
  'journal',
  'analytics',
  'notifications',
  'settings',
]);

function MainApp() {
  const { user: currentUser } = useUser();
  const { getToken } = useAuth();

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('blitzit_active_tab') || 'dashboard';
  });
  
  const [backendUser, setBackendUser] = useState(null);

  const { markPreferencesHydrated } = useSyncSettingsToMongo(getToken, !!currentUser?.id);

  const debouncedSaveTab = useMemo(
    () => createDebounced((tab) => patchUserState(getToken, { uiState: { lastActiveTab: tab } }), 800),
    [getToken]
  );

  useEffect(() => {
    localStorage.setItem('blitzit_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!currentUser?.id) return;
    debouncedSaveTab(activeTab);
  }, [activeTab, currentUser?.id, debouncedSaveTab]);

  const theme = useSettingsStore((state) => state.theme);
  const { fetchTasks, setAuthToken: setTaskAuthToken } = useTaskStore();
  const { fetchHabits, setAuthToken: setHabitAuthToken } = useHabitStore();
  const { fetchNotes, setAuthToken: setNoteAuthToken } = useNoteStore();
  const { fetchHistory: fetchJournalHistory, setAuthToken: setJournalAuthToken } = useJournalStore();

  useEffect(() => {
    const initData = async () => {
      if (currentUser) {
        try {
          const token = await getToken();
          if (token) {
            localStorage.setItem('token', token); // For backward compatibility
            const authHeaders = {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            };

            try {
              await fetch('/api/users/sync', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                  email:
                    currentUser.primaryEmailAddress?.emailAddress ||
                    `${currentUser.id}@users.clerk`,
                  displayName:
                    currentUser.fullName ||
                    currentUser.username ||
                    currentUser.primaryEmailAddress?.emailAddress?.split('@')[0] ||
                    'User',
                  photoURL: currentUser.imageUrl || '',
                }),
              });

              const res = await fetch('/api/users/me', {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const data = await res.json();
                setBackendUser(data.user ?? null);
                if (data.preferences) {
                  useSettingsStore.setState({
                    theme: data.preferences.theme === 'dark' ? 'dark' : 'light',
                    soundEnabled: data.preferences.soundEnabled !== false,
                    volume:
                      typeof data.preferences.volume === 'number'
                        ? data.preferences.volume
                        : 0.5,
                  });
                }
                if (data.uiState?.lastActiveTab && typeof data.uiState.lastActiveTab === 'string') {
                  const t = data.uiState.lastActiveTab;
                  if (KNOWN_APP_TAB_IDS.has(t)) setActiveTab(t);
                }
                writeUiSnapshot({
                  ts: Date.now(),
                  uiState: data.uiState || {},
                  preferences: data.preferences || {},
                });
                window.dispatchEvent(
                  new CustomEvent('user_ui_hydrate', {
                    detail: { uiState: data.uiState || {}, preferences: data.preferences || {} },
                  })
                );
                markPreferencesHydrated();
              } else {
                markPreferencesHydrated();
              }

              await logAppSession(getToken, {
                path: window.location.pathname,
                ts: Date.now(),
              });
            } catch (err) {
              console.error('Failed to sync backend user / preferences', err);
              markPreferencesHydrated();
            }

            setTaskAuthToken(token);
            useTaskStore.getState().setGetToken(getToken);
            fetchTasks();

            setHabitAuthToken(token);
            fetchHabits();

            setNoteAuthToken(token);
            fetchNotes();

            setJournalAuthToken(token);
            fetchJournalHistory();
          }
        } catch (error) {
          console.error("Error fetching Clerk token", error);
        }
      } else {
        clearUiSnapshot();
        useTaskStore.setState({ tasks: [], activeTaskId: null, error: null, authToken: null });
        useHabitStore.setState({ habits: [], completions: {}, error: null, authToken: null });
        useNoteStore.setState({ notes: [], error: null, authToken: null });
        useJournalStore.setState({ entries: [], error: null, authToken: null });
      }
    };
    initData();
  }, [currentUser, getToken, fetchTasks, setTaskAuthToken, fetchHabits, setHabitAuthToken, fetchNotes, setNoteAuthToken, fetchJournalHistory, setJournalAuthToken, markPreferencesHydrated]);

  // Derive effective role based on privileges
  const userRole = getEffectiveRole(backendUser, currentUser);

  const roleToTabs = {
    normal: ['dashboard', 'tasks', 'focus', 'calendar', 'notifications', 'settings'],
    pro: ['dashboard', 'tasks', 'focus', 'calendar', 'web-block', 'notifications', 'settings'],
    full: ['dashboard', 'tasks', 'focus', 'calendar', 'web-block', 'habit-tracker', 'journal', 'analytics', 'notifications', 'settings'],
    admin: ['dashboard', 'tasks', 'focus', 'calendar', 'web-block', 'habit-tracker', 'journal', 'analytics', 'notifications', 'settings'],
    moderator: ['dashboard', 'tasks', 'focus', 'calendar', 'web-block', 'habit-tracker', 'journal', 'analytics', 'notifications', 'settings']
  };

  const allowedTabs = roleToTabs[userRole] || roleToTabs.normal;

  useEffect(() => {
    const allowed = roleToTabs[userRole] || roleToTabs.normal;
    if (!allowed.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, userRole]);

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
    const handlePaymentSuccess = (event) => {
      const optimistic = event?.detail?.user;
      if (optimistic) setBackendUser((prev) => ({ ...prev, ...optimistic }));
      if (currentUser) {
        getToken().then((token) => {
          if (token) {
            fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } })
              .then((res) => res.json())
              .then((data) => {
                if (data.user) setBackendUser(data.user);
              })
              .catch(console.error);
          }
        });
      }
    };
    window.addEventListener('navigate_settings', handleSettings);
    window.addEventListener('navigate_dashboard', handleDashboard);
    window.addEventListener('payment_success', handlePaymentSuccess);
    return () => {
      window.removeEventListener('navigate_settings', handleSettings);
      window.removeEventListener('navigate_dashboard', handleDashboard);
      window.removeEventListener('payment_success', handlePaymentSuccess);
    };
  }, [currentUser, getToken]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'tasks': return <Tasks />;
      case 'habit-tracker':
        return (
          <PremiumFeatureWrapper feature="Habit Tracker" requiredRole="full" currentRole={userRole}>
            <HabitTracker />
          </PremiumFeatureWrapper>
        );
      case 'journal':
        return (
          <PremiumFeatureWrapper feature="Journal" requiredRole="full" currentRole={userRole}>
            <Journal />
          </PremiumFeatureWrapper>
        );
      case 'focus': return <Focus />;
      case 'web-block':
        return (
          <PremiumFeatureWrapper feature="Web Block" requiredRole="pro" currentRole={userRole}>
            <WebBlock />
          </PremiumFeatureWrapper>
        );
      case 'calendar':
        return (
          <PremiumFeatureWrapper feature="Calendar" requiredRole="pro" currentRole={userRole}>
            <Calendar />
          </PremiumFeatureWrapper>
        );
      case 'analytics':
        return (
          <PremiumFeatureWrapper feature="Analytics" requiredRole="full" currentRole={userRole}>
            <Analytics />
          </PremiumFeatureWrapper>
        );
      case 'notifications': return <Notifications />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div key={currentUser?.id} className="flex h-screen bg-slate-50 transition-colors duration-300 dark:bg-slate-900">
      <GlobalTimer />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} effectiveRole={userRole} />

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

import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <Routes>
      {/* Public Home Page or redirect to dashboard if logged in */}
      <Route
        path="/"
        element={
          <>
            <SignedIn>
              <Navigate to="/dashboard" replace />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        }
      />
      <Route
        path="/sign-in/*"
        element={
          <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
            <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/dashboard" />
          </div>
        }
      />
      <Route
        path="/sign-up/*"
        element={
          <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
            <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/dashboard" />
          </div>
        }
      />
      {/* Protected Dashboard Route */}
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <MainApp />
          </ProtectedRoute>
        }
      />
      {/* Fallback route */}
      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  );
}

export default App;
