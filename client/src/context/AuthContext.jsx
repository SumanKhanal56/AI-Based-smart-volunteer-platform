// This context manages login state and account actions.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);

// Store authentication data once and share it across the React application.
// Store authentication data once and share it across the React application.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Save the token in the browser and keep the user in React state.
  function saveSession(data) {
    localStorage.setItem('volunterr_token', data.token);
    setUser(data.user);
    return data.user;
  }

  // Restore the login session when the application first opens.
  useEffect(() => {
    // Without a saved token there is no session to restore.
    if (!localStorage.getItem('volunterr_token')) {
      setLoading(false);
      return;
    }
    // Ask the backend to validate the token and return the current account.
    api('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem('volunterr_token'))
      .finally(() => setLoading(false));
  }, []);

  // Share account actions with every component inside the application.
  const value = useMemo(() => ({
    user,
    loading,
    async login(credentials) {
      // The backend checks the password and may request a second factor.
      const data = await api('/auth/login', { method: 'POST', body: credentials });
      if (data.requiresTwoFactor) return data;
      saveSession(data);
      return { requiresTwoFactor: false, user: data.user };
    },
    async completeTwoFactorLogin(details) {
      const data = await api('/auth/2fa/login/verify', { method: 'POST', body: details });
      saveSession(data);
      return data.user;
    },
    async resendTwoFactorLogin(challengeToken) {
      return api('/auth/2fa/login/resend', { method: 'POST', body: { challengeToken } });
    },
    async register(details) {
      // Create the account first, then save the returned login session.
      const data = await api('/auth/register', { method: 'POST', body: details });
      saveSession(data);
      try {
        // Store onboarding temporarily so the chatbot can display it once.
        const onboarding = await api('/ai/onboarding', { method: 'POST' });
        sessionStorage.setItem('volunterr_onboarding', JSON.stringify(onboarding));
        window.dispatchEvent(new CustomEvent('volunterr:onboarding', { detail: onboarding }));
      } catch (error) {
        console.warn('Onboarding assistant could not start:', error.message);
      }
      return data.user;
    },
    logout() {
      // Remove browser session values so protected pages can no longer be opened.
      localStorage.removeItem('volunterr_token');
      sessionStorage.removeItem('two_factor_challenge');
      sessionStorage.removeItem('two_factor_masked_email');
      sessionStorage.removeItem('two_factor_return_to');
      setUser(null);
    },
    async refreshUser() {
      const data = await api('/auth/me');
      setUser(data.user);
      return data.user;
    },
    async updateProfile(details) {
      const data = await api('/auth/profile', { method: 'PATCH', body: details });
      setUser(data.user);
      return data.user;
    }
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Give components an easy way to use the shared authentication context.
// Give components an easy way to use the shared authentication context.
export function useAuth() {
  // Read the current user and authentication actions.
  return useContext(AuthContext);
}
