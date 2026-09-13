import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { getSupabaseClient } from './services/supabase';

// --------------------------------------------------------------------
// PURGE STALE SERVICE WORKERS & CACHESTORAGE (KILLS PERSISTENT 404S)
// --------------------------------------------------------------------
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    }).catch(() => {});
  }
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name);
      }
    }).catch(() => {});
  }
}

// --------------------------------------------------------------------
// VERIFICATION, RESET PASSWORD & REDIRECT INTERCEPTOR
// --------------------------------------------------------------------
if (typeof window !== 'undefined') {
  const hash = window.location.hash;
  const search = window.location.search;

  if (
    hash.includes('access_token') ||
    hash.includes('type=signup') ||
    hash.includes('type=recovery') ||
    search.includes('code=')
  ) {
    const client = getSupabaseClient();
    if (client) {
      const code = new URLSearchParams(search).get('code');
      if (code) {
        client.auth.exchangeCodeForSession(code).catch(() => {});
      }

      client.auth.onAuthStateChange(async (event, session) => {
        // 1. New user registration confirmation
        if (
          (event === 'SIGNED_IN' || event === 'USER_UPDATED') &&
          session?.user?.email_confirmed_at &&
          !hash.includes('type=recovery')
        ) {
          window.history.replaceState(null, '', window.location.pathname);
          alert('Email verified successfully! You can now return to the ShiftDrop app and sign in.');
        }

        // 2. Forgot Password recovery flow
        if (event === 'PASSWORD_RECOVERY') {
          const newPassword = window.prompt('Please enter your new ShiftDrop password:');
          if (newPassword && newPassword.trim().length >= 6) {
            const { error } = await client.auth.updateUser({ password: newPassword.trim() });
            if (error) {
              alert(`Password update failed: ${error.message}`);
            } else {
              alert('Password updated successfully! You can now sign in with your new password.');
              window.history.replaceState(null, '', window.location.pathname);
              window.location.reload();
            }
          } else if (newPassword) {
            alert('Password must be at least 6 characters long.');
          }
        }
      });
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);