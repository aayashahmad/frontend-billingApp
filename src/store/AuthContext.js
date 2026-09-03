import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { isCancelled, setAuthToken, setUnauthorizedHandler } from '../services/api';
import * as authService from '../services/authService';
import {
  clearSession,
  loadSession,
  saveSession,
} from '../services/tokenStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  // Distinguishes "still reading the keychain" from "definitely logged out",
  // so the app shows a splash instead of flashing the login screen.
  const [restoring, setRestoring] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  // Set only when a live session is rejected by the server, so the login
  // screen can say WHY the user is suddenly looking at it.
  const [sessionNotice, setSessionNotice] = useState(null);
  const mountedRef = useRef(true);
  const sessionRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applySession = useCallback((next) => {
    setAuthToken(next?.token ?? null);
    sessionRef.current = next;
    setSession(next);
  }, []);

  const logout = useCallback(async () => {
    applySession(null);
    setError(null);
    await clearSession();
  }, [applySession]);

  // Restore a persisted session on cold start.
  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await loadSession();
      if (!active) return;
      if (stored) applySession(stored);
      setRestoring(false);
    })();
    return () => {
      active = false;
    };
  }, [applySession]);

  // A 401 from any request drops the dead session. The notice is set only
  // when there WAS a session — a wrong password on the login screen also
  // comes back 401 and must not claim the session expired.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (sessionRef.current) {
        setSessionNotice('Your session expired. Please sign in again.');
      }
      applySession(null);
      clearSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [applySession]);

  const runAuth = useCallback(
    async (fn, values) => {
      setSubmitting(true);
      setError(null);
      try {
        setSessionNotice(null);
        const result = await fn(values);
        if (!mountedRef.current) return null;
        const next = { token: result.token, username: result.username };
        applySession(next);
        await saveSession(next);
        return next;
      } catch (err) {
        if (!mountedRef.current || isCancelled(err)) return null;
        setError(err.message);
        return null;
      } finally {
        if (mountedRef.current) setSubmitting(false);
      }
    },
    [applySession],
  );

  const login = useCallback(
    (values) => runAuth(authService.login, values),
    [runAuth],
  );

  const signup = useCallback(
    (values) => runAuth(authService.signup, values),
    [runAuth],
  );

  const clearError = useCallback(() => setError(null), []);

  /**
   * Adopts a session produced outside the login form — the password reset
   * ends by signing the owner in, rather than returning them to a login
   * screen to retype the password they just chose.
   */
  const adoptSession = useCallback(
    async (next) => {
      if (!next?.token) return;
      setSessionNotice(null);
      applySession(next);
      await saveSession(next);
    },
    [applySession],
  );

  const value = useMemo(
    () => ({
      username: session?.username ?? null,
      isAuthenticated: Boolean(session?.token),
      restoring,
      submitting,
      error,
      sessionNotice,
      login,
      signup,
      logout,
      adoptSession,
      clearError,
    }),
    [session, restoring, submitting, error, sessionNotice, login, signup, logout, adoptSession, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
};
