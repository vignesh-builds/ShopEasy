// All communication with the Spring Boot backend lives in this one file.

// Render-ல் VITE_API_URL-ல் '/api' விடுபட்டிருந்தாலோ அல்லது கூடுதல் '/' இருந்தாலோ தானாக சரிசெய்யும் logic
function resolveApiBase() {
  const envUrl = (import.meta.env && import.meta.env.VITE_API_URL) ? import.meta.env.VITE_API_URL.trim() : '';
  if (!envUrl) {
    return '/api';
  }
  const cleanUrl = envUrl.replace(/\/+$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
}

const API_BASE = resolveApiBase();

const TOKEN_KEY = 'shopeasyToken';
const USER_KEY = 'shopeasyUser';

/* ---------- token / user persistence (browser localStorage) ---------- */
export const session = {
  getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  },
  save(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

// AuthContext registers a callback here; it runs when the server rejects our token (expired / invalid).
let unauthorizedHandler = null;
export const setUnauthorizedHandler = (fn) => { unauthorizedHandler = fn; };

/* ---------- generic request: adds the JWT, parses JSON, throws Error(message) on failure ---------- */
async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = session.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(API_BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('Cannot reach the backend server. Please verify backend is up on Render.');
  }

  const data = await response.json().catch(() => ({}));   // 204 / empty bodies
  if (!response.ok) {
    if (response.status === 401 && token && !path.startsWith('/auth/') && unauthorizedHandler) {
      unauthorizedHandler();
    }
    if (response.status === 404 && !data.error) {
      throw new Error('API route not found - backend endpoint missing or wrong URL path.');
    }
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

const queryString = (params) => {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => { if (v) qs.set(k, v); });
  const s = qs.toString();
  return s ? `?${s}` : '';
};

/* ---------- endpoints (one function per backend route) ---------- */
export const api = {
  products: (params) => request('/products' + queryString(params)),
  product: (id) => request(`/products/${id}`),
  reviews: (productId) => request(`/products/${productId}/reviews`),
  saveReview: (productId, review) => request(`/products/${productId}/reviews`, { method: 'POST', body: review }),
  deleteMyReview: (productId) => request(`/products/${productId}/reviews/mine`, { method: 'DELETE' }),
  wishlist: () => request('/wishlist'),
  addWishlist: (productId) => request(`/wishlist/${productId}`, { method: 'PUT' }),
  removeWishlist: (productId) => request(`/wishlist/${productId}`, { method: 'DELETE' }),
  mergeWishlist: (productIds) => request('/wishlist/merge', { method: 'POST', body: { productIds } }),
  myOrders: () => request('/orders/mine'),
  categories: () => request('/categories'),
  cancelOrder: (id, reason) => request(`/orders/${id}/cancel`, { method: 'POST', body: { reason } }),
  returnOrder: (id, reason) => request(`/orders/${id}/return`, { method: 'POST', body: { reason } }),
  placeOrder: (order) => request('/orders', { method: 'POST', body: order }),

  recommendations: (productId) => request(`/products/${productId}/recommendations`),

  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  register: (details) => request('/auth/register', { method: 'POST', body: details }),
  me: () => request('/auth/me'),
  verifyEmail: (token) => request('/auth/verify-email', { method: 'POST', body: { token } }),
  resendVerification: () => request('/auth/resend-verification', { method: 'POST' }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token, password) => request('/auth/reset-password', { method: 'POST', body: { token, password } }),

  admin: {
    summary: () => request('/admin/summary'),
    orders: () => request('/admin/orders'),
    updateOrderStatus: (id, status) => request(`/admin/orders/${id}/status`, { method: 'PUT', body: { status } }),
    createProduct: (product) => request('/admin/products', { method: 'POST', body: product }),
    updateProduct: (id, product) => request(`/admin/products/${id}`, { method: 'PUT', body: product }),
    deleteProduct: (id) => request(`/admin/products/${id}`, { method: 'DELETE' }),
  },
};
