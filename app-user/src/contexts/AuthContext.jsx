import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [orderType, setOrderType] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [savedUser, savedOrderType] = await Promise.all([
          AsyncStorage.getItem('flavours_user'),
          AsyncStorage.getItem('flavours_order_type'),
        ]);
        if (savedUser) setUser(JSON.parse(savedUser));
        if (savedOrderType) setOrderType(savedOrderType);
      } catch (err) {
        // ignore corrupted storage
      }
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (user) AsyncStorage.setItem('flavours_user', JSON.stringify(user));
    else AsyncStorage.removeItem('flavours_user');
  }, [user]);

  useEffect(() => {
    if (orderType) AsyncStorage.setItem('flavours_order_type', orderType);
    else AsyncStorage.removeItem('flavours_order_type');
  }, [orderType]);

  const login = (userData) => setUser(userData);
  const logout = () => {
    setUser(null);
    setOrderType(null);
  };
  const selectOrderType = (type) => setOrderType(type);

  return (
    <AuthContext.Provider value={{ user, orderType, login, logout, selectOrderType, hydrated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
