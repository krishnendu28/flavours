const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  sendOtp: (phone) => request('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }),
  verifyOtp: (phone, otp, name) => request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, otp, name }) }),

  adminLogin: (username, password) => request('/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

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
