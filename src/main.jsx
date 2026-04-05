import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { AuthProvider } from './context/AuthContext'

import AdminApp from './admin/AdminApp.jsx'

const path = window.location.pathname;

if (path.startsWith('/admin')) {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <AdminApp />
    </StrictMode>
  )
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>
  )
}
