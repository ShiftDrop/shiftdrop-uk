import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { getSupabaseClient } from './services/supabase';

// --------------------------------------------------------------------
// VERIFICATION & REDIRECT INTERCEPTOR
// --------------------------------------------------------------------
// Executes immediately when shiftdrop.co.uk loads to catch tokens
// emitted by the email confirmation link.
if (typeof window !== 'undefined') {
  const hash = window.location.hash;
  const search = window.location.search;

  if (hash.includes('access_token') || hash.includes('type=signup') || search.includes('code=')) {
    const client = getSupabaseClient();
    if (client) {
      // 1. Process PKCE exchange code if provided by Supabase
      const code = new URLSearchParams(search).get('code');
      if (code) {
        client.auth.exchangeCodeForSession(code).catch(() => {});
      }

      // 2. Listen for confirmation event and sanitize URL
      client.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user?.email_confirmed_at) {
          window.history.replaceState(null, '', window.location.pathname);
          alert('Email verified successfully! You can now return to the ShiftDrop app and sign in.');
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