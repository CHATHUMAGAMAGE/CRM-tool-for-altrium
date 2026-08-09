import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  clearTokens,
  getStoredTokens,
} from '@/services/token-storage';
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  type CurrentUser,
} from '@/services/auth';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: CurrentUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<CurrentUser | null>(null);

  const restoreSession = useCallback(async () => {
    try {
      const { access, refresh } = await getStoredTokens();

      if (!access && !refresh) {
        setStatus('unauthenticated');
        return;
      }

      const currentUser = await getCurrentUser();

      setUser(currentUser);
      setStatus('authenticated');
    } catch {
      await clearTokens();
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const login = useCallback(
    async (username: string, password: string) => {
      await loginUser(username, password);

      const currentUser = await getCurrentUser();

      setUser(currentUser);
      setStatus('authenticated');
    },
    [],
  );

  const logout = useCallback(async () => {
  try {
    await logoutUser();
  } finally {
    setUser(null);
    setStatus('unauthenticated');
  }
}, []);
  const value = useMemo(
    () => ({
      status,
      user,
      login,
      logout,
    }),
    [status, user, login, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }

  return context;
}   