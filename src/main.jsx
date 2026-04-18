import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/global.css'
import App from './App.jsx'

// Eager Service Worker registration for Web Push.
// registerPushSubscription() inside App re-uses the existing registration.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(e => console.warn('SW registration:', e.message))
  })
}

// Apply persisted theme as early as possible to avoid flash.
try {
  const t = localStorage.getItem('fb_theme') || 'light'
  document.documentElement.setAttribute('data-theme', t)
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
