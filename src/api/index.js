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

// Request interceptor — attach token and log request details
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Print frontend request details for debugging
  const fullUrl = `${config.baseURL || ''}${config.url}`;
  console.log(`\n🚀 [Frontend Request]`);
  console.log(`- URL: ${fullUrl}`);
  console.log(`- Method: ${config.method?.toUpperCase()}`);
  console.log(`- Headers:`, config.headers);
  if (config.url?.includes('/books')) {
    console.log(`📚 [Books API Request Log] Initiated request to ${fullUrl}`);
  }
  if (config.data) {
    if (config.data instanceof FormData) {
      console.log(`- Payload (FormData):`);
      for (const [key, value] of config.data.entries()) {
        if (value instanceof File) {
          console.log(`  - ${key}: File (name: "${value.name}", size: ${value.size} bytes)`);
        } else {
          console.log(`  - ${key}: ${value}`);
        }
      }
    } else {
      console.log(`- Payload:`, config.data);
    }
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

let lastNetworkErrorTime = 0;

// Response interceptor — handle errors gracefully
api.interceptors.response.use(
  (response) => {
    const fullUrl = response.config ? `${response.config.baseURL || ''}${response.config.url}` : 'N/A';
    console.log(`✅ [Frontend Response] URL: ${fullUrl} - Status: ${response.status}`);
    if (response.config?.url?.includes('/books')) {
      console.log(`📚 [Books API Response Success] URL: ${fullUrl}`);
      console.log(`- Status: ${response.status}`);
      console.log(`- Body:`, response.data);
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const fullUrl = error.config ? `${error.config.baseURL || ''}${error.config.url}` : 'N/A';
    
    // Add network debugging logs for /books (and other errors)
    console.error(`❌ [Frontend Response Error] URL: ${fullUrl} - Status: ${status || 'Network Error'}`);
    console.error(`📚 [API Error Diagnostics]`);
    console.error(`- Request URL: ${fullUrl}`);
    console.error(`- Response Status: ${status || 'Network Error / Timeout / CORS'}`);
    console.error(`- Response Body:`, error.response?.data);
    console.error(`- Error Stack Trace:`, error.stack);

    // 401 Unauthorized — logout
    if (status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Network / timeout errors (fetch actually fails)
    if (!error.response) {
      error.hasGlobalToast = true;
      const now = Date.now();
      if (now - lastNetworkErrorTime > 3000) {
        lastNetworkErrorTime = now;
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          toast.error('Request timed out. Please check your connection and try again.', { id: 'network-timeout' });
        } else {
          toast.error('Network connectivity failed. Please check if the server is running and accessible.', { id: 'network-error' });
        }
      }
      return Promise.reject(error);
    }

    // Show user-friendly message for known status codes (except if specific message is in response data)
    const serverMessage = error.response.data?.message;
    if (!serverMessage) {
      const friendlyMessage = ERROR_MESSAGES[status];
      if (friendlyMessage) {
        error.hasGlobalToast = true;
        toast.error(friendlyMessage, { id: `http-${status}` });
      }
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
  upload: (formData, onUploadProgress) => api.post('/books/upload', formData, { onUploadProgress }),
  fetchMetadata: (data) => api.post('/books/fetch-metadata', data),
  refreshMetadata: (id) => api.post(`/books/${id}/refresh`),
  updateCategory: (id, categoryId) => api.post(`/books/${id}/category`, { category_id: categoryId }),
  updateCoverImage: (id, formData, type, onUploadProgress) => api.patch(`/books/${id}/cover?type=${type}`, formData, { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress }),

  auditBooks: () => api.post('/catalog-audit/run'),
  getAuditReport: () => api.get('/books/audit-report'),
  import: (formData, duplicateMode, onUploadProgress) => api.post(`/books/bulk-import?duplicateMode=${duplicateMode}`, formData, { timeout: 300000, headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress }),
  preview: (formData, onUploadProgress) => api.post('/books/bulk-import?preview=true', formData, { timeout: 120000, headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress }),
  getImportHistory: () => api.get('/books/import-history'),
  getImportSessionStatus: (id) => api.get(`/books/import-history/${id}`),
  downloadTemplate: (format) => api.get(`/books/import-template?format=${format}`, { responseType: 'blob' }),
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
  import: (formData, duplicateMode) => api.post(`/customers/import?duplicateMode=${duplicateMode}`, formData, { timeout: 300000 }),
  preview: (formData) => api.post('/customers/import?preview=true', formData, { timeout: 120000 }),
  getImportHistory: () => api.get('/customers/import-history'),
  getImportSessionStatus: (id) => api.get(`/customers/import-history/${id}`),
  getImportReports: () => api.get('/customers/import-reports'),
  downloadImportReport: (id) => api.get(`/customers/import-reports/${id}/download`, { responseType: 'blob' }),
  downloadTemplate: (format) => api.get(`/customers/import-template?format=${format}`, { responseType: 'blob' }),
  export: (params) => api.get('/customers/export', { params, responseType: 'blob' }),
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



// ── Settings ──────────────────────────────────────
export const settingsAPI = {
  getStore: () => api.get('/settings/store'),
  updateStore: (data) => api.put('/settings/store', data),
  getPayment: () => api.get('/settings/payment'),
  updatePayment: (data) => api.put('/settings/payment', data),
};

export default api;

