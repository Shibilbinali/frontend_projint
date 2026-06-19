import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

let API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

if (API_BASE) {
  API_BASE = API_BASE.trim();
  if (!/^https?:\/\//i.test(API_BASE)) {
    if (API_BASE.startsWith('//')) {
      API_BASE = `https:${API_BASE}`;
    } else {
      API_BASE = `https://${API_BASE}`;
    }
  }
}

console.log('VITE_API_URL =', import.meta.env.VITE_API_URL);
console.log('API_BASE =', API_BASE);

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30 second timeout
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// User-friendly error messages by status code
const ERROR_MESSAGES = {
  401: null, // handled separately (logout)
  403: 'You do not have permission to perform this action.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'An unexpected server error occurred. Please try again.',
  502: 'The server is temporarily unavailable. Please try again shortly.',
  503: 'The service is currently experiencing high demand. Please try again later.',
};

// Response interceptor — handle errors gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // 401 Unauthorized — logout
    if (status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Network / timeout errors
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast.error('Request timed out. Please check your connection and try again.', { id: 'network-timeout' });
      } else {
        toast.error('Network error. Please check your internet connection.', { id: 'network-error' });
      }
      return Promise.reject(error);
    }

    // Show user-friendly message for known status codes
    const friendlyMessage = ERROR_MESSAGES[status];
    if (friendlyMessage) {
      toast.error(friendlyMessage, { id: `http-${status}` });
    }

    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ── Books ─────────────────────────────────────────
export const booksAPI = {
  getAll: (params) => api.get('/books', { params }),
  getById: (id) => api.get(`/books/${id}`),
  create: (data) => api.post('/books', data),
  update: (id, data) => api.put(`/books/${id}`, data),
  delete: (id) => api.delete(`/books/${id}`),
  upload: (formData) => api.post('/books/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  fetchMetadata: (data) => api.post('/books/fetch-metadata', data),
  refreshMetadata: (id) => api.post(`/books/${id}/refresh`),
  verifyCategories: () => api.post('/books/verify-categories'),
  getVerifyCategoriesReport: () => api.get('/books/verify-categories-report'),
  getManualReview: () => api.get('/books/manual-review'),
  approveCategory: (id, data) => api.post(`/books/${id}/approve-category`, data),
  suggestCategory: (id, data) => api.post(`/books/${id}/suggest-category`, data),
  rejectSuggestion: (id) => api.post(`/books/${id}/reject-suggestion`),
  auditBooks: () => api.post('/books/audit'),
  getAuditReport: () => api.get('/books/audit-report'),
};

// ── Categories ────────────────────────────────────
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// ── Inventory ─────────────────────────────────────
export const inventoryAPI = {
  getAll: (params) => api.get('/inventory', { params }),
  updateStock: (id, data) => api.put(`/inventory/${id}/stock`, data),
};

// ── Customers ─────────────────────────────────────
export const customersAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

// ── Sales ─────────────────────────────────────────
export const salesAPI = {
  getAll: (params) => api.get('/sales', { params }),
  getById: (id) => api.get(`/sales/${id}`),
  create: (data) => api.post('/sales', data),
};

// ── Dashboard ─────────────────────────────────────
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// ── Users ─────────────────────────────────────────
export const usersAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getAuditLogs: () => api.get('/users/audit-logs'),
};

export default api;
