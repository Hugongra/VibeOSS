import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface AuthState {
  isAuthenticated: boolean;
  user: { email: string } | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ email: string } | null>(() => {
    const stored = localStorage.getItem("vibeoss_user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (email: string, _password: string) => {
    // TODO: Replace with real API call
    const u = { email };
    localStorage.setItem("vibeoss_user", JSON.stringify(u));
    setUser(u);
  }, []);

  const register = useCallback(async (email: string, _password: string) => {
    // TODO: Replace with real API call
    const u = { email };
    localStorage.setItem("vibeoss_user", JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("vibeoss_user");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated: !!user, user, login, register, logout }),
    [user, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
