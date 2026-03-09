import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/api";
import { setTokens, getTokens, clearTokens } from "../utils/tokenStorage";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const tokens = await getTokens();
      if (tokens?.accessToken) {
        try {
          const res = await api.get("/profiles");
          setUser({ loggedIn: true });
        } catch {
          await clearTokens();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (requestId, otp) => {
    const res = await api.post("/auth/verify", { requestId, otp });
    await setTokens(res.data.data);
    setUser({ loggedIn: true });
  };

  const logout = async () => {
    await api.post("/auth/logout");
    await clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);