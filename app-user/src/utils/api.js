import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../config';

const TOKEN_KEY = 'flavours_token';

async function getToken() {
  return (await AsyncStorage.getItem(TOKEN_KEY)) || '';
}

async function setToken(token) {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const token = await getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(url, { headers, ...options });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) await setToken('');
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  sendOtp: (phone) => request('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }),

  verifyOtp: async (phone, otp, name) => {
    const res = await request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp, name }),
    });
    await setToken(res.token);
    return res;
  },

  getCategories: () => request('/menu/categories'),
  getMenuItems: (categoryId) =>
    request(`/menu/items${categoryId ? `?category_id=${categoryId}` : ''}`),

  createOrder: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),

  getUserOrders: (userId) => request(`/orders/user/${userId}`),
  getOrder: (id) => request(`/orders/${id}`),

  savePushToken: (token) => request('/users/push-token', { method: 'PUT', body: JSON.stringify({ token }) }),
};
