const API_BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'flavours_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(url, { headers, ...options });
  const data = await res.json().catch(() => null);
  if (res.status === 401) setToken('');
  if (!res.ok) throw new Error(data?.error || 'Request failed');
  if (data === null) throw new Error(`Unexpected response from ${url} (${res.status})`);
  return data;
}

export const api = {
  sendOtp: (phone) => request('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }),

  verifyOtp: async (phone, otp, name) => {
    const res = await request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, otp, name }) });
    setToken(res.token);
    return res;
  },

  adminLogin: async (username, password) => {
    const res = await request('/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    setToken(res.token);
    return res;
  },

  getCategories: () => request('/menu/categories'),
  getMenuItems: (categoryId) => request(`/menu/items${categoryId ? `?category_id=${categoryId}` : ''}`),
  updateMenuItem: (id, data) => request(`/menu/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  createMenuItem: (data) => request('/menu/items', { method: 'POST', body: JSON.stringify(data) }),
  deleteMenuItem: (id) => request(`/menu/items/${id}`, { method: 'DELETE' }),

  createOrder: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),

  getUserOrders: (userId) => request(`/orders/user/${userId}`),
  getOrder: (id) => request(`/orders/${id}`),
  getAllOrders: (status, source) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (source) params.set('source', source);
    const qs = params.toString();
    return request(`/orders${qs ? `?${qs}` : ''}`);
  },
  updateOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  createPosOrder: (data) => request('/pos/orders', { method: 'POST', body: JSON.stringify(data) }),
};
