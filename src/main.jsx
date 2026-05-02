import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.jsx'

import AdminApp from './admin/AdminApp.jsx'

// Import your publishable key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const MissingKeyFallback = () => (
  <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: 'red', textAlign: 'center' }}>
    <h2>Missing Clerk Publishable Key</h2>
    <p>Please add <code>VITE_CLERK_PUBLISHABLE_KEY</code> to your <b>.env</b> file.</p>
  </div>
);

if (!PUBLISHABLE_KEY) {
  createRoot(document.getElementById('root')).render(<MissingKeyFallback />);
} else {

const path = window.location.pathname;

if (path.startsWith('/admin')) {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <BrowserRouter>
          <AdminApp />
        </BrowserRouter>
      </ClerkProvider>
    </StrictMode>
  )
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ClerkProvider>
    </StrictMode>
  )
}
}
