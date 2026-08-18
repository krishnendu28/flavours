import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

function generateGuestId() {
  const existing = localStorage.getItem('flavours_guest_id');
  if (existing) return existing;
  const id = 'guest-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  localStorage.setItem('flavours_guest_id', id);
  return id;
}

function getOrCreateGuestUser() {
  const saved = localStorage.getItem('flavours_user');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed && parsed.id) return parsed;
  }
  const guest = { id: generateGuestId(), name: 'Guest', phone: '' };
  localStorage.setItem('flavours_user', JSON.stringify(guest));
  return guest;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getOrCreateGuestUser());
  const [orderType, setOrderType] = useState(() => localStorage.getItem('flavours_order_type') || null);

  useEffect(() => {
    if (user) localStorage.setItem('flavours_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    if (orderType) localStorage.setItem('flavours_order_type', orderType);
    else localStorage.removeItem('flavours_order_type');
  }, [orderType]);

  const selectOrderType = (type) => setOrderType(type);

  return (
    <AuthContext.Provider value={{ user, orderType, selectOrderType }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
