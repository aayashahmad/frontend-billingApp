import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { isCancelled } from '../services/api';
import { getProfile } from '../services/authService';
import { updateBusinessProfile } from '../services/businessService';
import { useAuth } from './AuthContext';

const ProfileContext = createContext(null);

/**
 * Signed-in owner's profile.
 *
 * Held in context because it is read by the drawer, the profile screen and
 * both PDF templates — fetching per consumer would mean repeated /auth/me
 * calls for a value that changes once per session.
 */
export const ProfileProvider = ({ children }) => {
  const { isAuthenticated, username } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchProfile = useCallback(
    async (controller) => {
      if (!isAuthenticated) {
        setProfile(null);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await getProfile({ signal: controller?.signal });
        if (!mountedRef.current || controller?.signal.aborted) return;
        setProfile(data);
      } catch (err) {
        if (!mountedRef.current || isCancelled(err)) return;
        setError(err.message);
      } finally {
        if (mountedRef.current && !controller?.signal.aborted) setLoading(false);
      }
    },
    [isAuthenticated],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchProfile(controller);
    return () => controller.abort();
  }, [fetchProfile]);

  const refresh = useCallback(() => {
    const controller = new AbortController();
    return fetchProfile(controller);
  }, [fetchProfile]);

  /**
   * Saves the letterhead and merges the response into the cached profile, so
   * the very next printed document uses the new details without a refetch.
   */
  const saveBusinessProfile = useCallback(async (values) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateBusinessProfile(values);
      if (!mountedRef.current) return null;
      setProfile((current) => ({ ...(current ?? {}), ...updated }));
      return updated;
    } catch (err) {
      if (!mountedRef.current || isCancelled(err)) return null;
      setError(err.message);
      return null;
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      // Fall back to the username carried in the token so documents still
      // carry a shop name if /auth/me has not landed yet.
      profile: profile ?? (username ? { username } : null),
      loading,
      saving,
      error,
      refresh,
      saveBusinessProfile,
      // Keyed off the *fetched* profile, not the username fallback —
      // otherwise a returning owner would flash the setup screen before
      // /auth/me lands.
      profileLoaded: Boolean(profile),
      needsOnboarding: Boolean(profile) && !profile.onboarded,
    }),
    [profile, username, loading, saving, error, refresh, saveBusinessProfile],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used inside a ProfileProvider');
  }
  return context;
};
