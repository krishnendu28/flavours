import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('flavours_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [orderType, setOrderType] = useState(() => localStorage.getItem('flavours_order_type') || null);

  useEffect(() => {
    if (user) localStorage.setItem('flavours_user', JSON.stringify(user));
    else localStorage.removeItem('flavours_user');
  }, [user]);

  useEffect(() => {
    if (orderType) localStorage.setItem('flavours_order_type', orderType);
    else localStorage.removeItem('flavours_order_type');
  }, [orderType]);

  const login = (userData) => setUser(userData);
  const logout = () => { setUser(null); setOrderType(null); localStorage.clear(); };
  const selectOrderType = (type) => setOrderType(type);

  return (
    <AuthContext.Provider value={{ user, orderType, login, logout, selectOrderType }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
