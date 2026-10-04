/**
 * Session store.
 *
 * Owns the bearer token + current user, and is the only place that talks to
 * /auth/*. It also registers the client's 401 handler so an expired token
 * anywhere in the app lands the user back on the login screen once.
 *
 * The React Query cache is cleared on sign-out (and on account switch) so no
 * data from the previous tenant can flash on screen.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { ApiError, configureApi, setUnauthorizedHandler } from '@/api/client';
import { authApi, type SignInInput, type SignUpInput } from '@/api/auth';
import type { User } from '@/api/types';
import { clearToken, loadToken, peekToken, saveToken } from '@/lib/tokenStore';

export type AuthStatus = 'bootstrapping' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  currency: string;
  /** Message to surface on the login screen after a forced sign-out. */
  signedOutReason: string | null;
  consumeSignedOutReason: () => void;
  bootstrap: () => Promise<void>;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: (reason?: string) => Promise<void>;
  /** Refresh `user` after a profile edit. */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Online-only app: a stale-while-revalidate window keeps list screens
      // snappy when navigating back and forth without extra requests.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        // Never retry auth/validation failures; give network blips one retry.
        if (error instanceof ApiError) {
          if (error.status === 401 || error.status === 0) return failureCount < 1;
          return false;
        }
        return failureCount < 1;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [status, setStatus] = useState<AuthStatus>('bootstrapping');
  const [user, setUser] = useState<User | null>(null);
  const [signedOutReason, setSignedOutReason] = useState<string | null>(null);
  const bootstrapped = useRef(false);

  useEffect(() => {
    configureApi({ tokenGetter: () => peekToken() });
  }, []);

  const hardSignOut = useCallback(async (reason?: string) => {
    await clearToken();
    queryClient.clear();
    setUser(null);
    setStatus('signedOut');
    if (reason !== undefined) {
      setSignedOutReason(reason);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler((error) => {
      void hardSignOut(error.message || 'Your session has expired. Please sign in again.');
    });
    return () => setUnauthorizedHandler(null);
  }, [hardSignOut]);

  const bootstrap = useCallback(async () => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const token = await loadToken();

    if (token === null) {
      setStatus('signedOut');
      return;
    }

    configureApi({ tokenGetter: () => peekToken() });

    try {
      const me = await authApi.me();
      setUser(me);
      setStatus('signedIn');
    } catch (error) {
      // A 401 here is handled by the unauthorized hook; anything else (server
      // down) should not destroy a token that is probably still valid.
      if (error instanceof ApiError && error.status !== 0) {
        await hardSignOut();
      } else {
        setStatus('signedOut');
        setSignedOutReason('Cannot reach the server right now. Check the backend and try again.');
      }
    }
  }, [hardSignOut]);

  useEffect(() => {
    // Restoring the session reads SecureStore + the network; the setState
    // calls inside happen asynchronously, so no cascading render occurs.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void bootstrap();
  }, [bootstrap]);

  const signIn = useCallback(
    async (input: SignInInput) => {
      const session = await authApi.signIn(input);
      await saveToken(session.token);
      queryClient.clear();
      setUser(session.user);
      setStatus('signedIn');
      setSignedOutReason(null);
    },
    [],
  );

  const signUp = useCallback(async (input: SignUpInput) => {
    const session = await authApi.signUp(input);
    await saveToken(session.token);
    queryClient.clear();
    setUser(session.user);
    setStatus('signedIn');
    setSignedOutReason(null);
  }, []);

  const signOut = useCallback(
    async (reason?: string) => {
      try {
        await authApi.signOut();
      } catch {
        // Signing out locally matters more than the server acknowledging it.
      }
      await hardSignOut(reason);
    },
    [hardSignOut],
  );

  const refreshUser = useCallback(async () => {
    if (peekToken() === null) return;
    setUser(await authApi.me());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      currency: user?.currency ?? 'PHP',
      signedOutReason,
      consumeSignedOutReason: () => setSignedOutReason(null),
      bootstrap,
      signIn,
      signUp,
      signOut,
      refreshUser,
    }),
    [status, user, signedOutReason, bootstrap, signIn, signUp, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return ctx;
}
