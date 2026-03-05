import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(error);
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
          headers: { Authorization: `Bearer ${refreshToken}` }
        });

        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: RegisterData) => api.post('/auth/register', data),
  login: (data: LoginData) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: Partial<User>) => api.put('/auth/me', data),
  changePassword: (data: ChangePasswordData) => api.post('/auth/change-password', data),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
};

// Documents API
export const documentsAPI = {
  upload: (formData: FormData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: (params?: Record<string, unknown>) => api.get('/documents/', { params }),
  getStats: () => api.get('/documents/stats'),
  getById: (id: string) => api.get(`/documents/${id}`),
  update: (id: string, data: Partial<Document>) => api.put(`/documents/${id}`, data),
  delete: (id: string) => api.delete(`/documents/${id}`),
  revoke: (id: string) => api.post(`/documents/${id}/revoke`),
  regenerateLink: (id: string) => api.post(`/documents/${id}/regenerate-link`),
  download: (id: string) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
};

// Share API
export const shareAPI = {
  getSharedDoc: (token: string) => api.get(`/share/${token}`),
  verifyPassword: (token: string, password: string) =>
    api.post(`/share/${token}/verify-password`, { password }),
  viewDocument: (token: string, password?: string) =>
    api.post(`/share/${token}/view`, { password }, { responseType: 'blob' }),
  downloadDocument: (token: string, password?: string) =>
    api.post(`/share/${token}/download`, { password }, { responseType: 'blob' }),
  printDocument: (token: string) => api.post(`/share/${token}/print`),
  getActivity: (token: string) => api.get(`/share/${token}/activity`),
};

// Admin API
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getChartData: (days?: number) => api.get('/admin/chart-data', { params: { days } }),
  getAllUsers: (params?: Record<string, unknown>) => api.get('/admin/users', { params }),
  getUser: (id: string) => api.get(`/admin/users/${id}`),
  createUser: (data: Partial<User>) => api.post('/admin/users/create', data),
  suspendUser: (id: string) => api.post(`/admin/users/${id}/suspend`),
  activateUser: (id: string) => api.post(`/admin/users/${id}/activate`),
  resetUserPassword: (id: string, newPassword: string) =>
    api.post(`/admin/users/${id}/reset-password`, { new_password: newPassword }),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  getAllDocuments: (params?: Record<string, unknown>) => api.get('/admin/documents', { params }),
  deleteDocument: (id: string) => api.delete(`/admin/documents/${id}`),
  getLogs: (params?: Record<string, unknown>) => api.get('/admin/logs', { params }),
};

// Types
export interface User {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phone?: string;
  role: 'user' | 'admin';
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  last_login?: string;
  profile_image?: string;
}

export interface Document {
  id: string;
  user_id: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string;
  share_token: string;
  has_password: boolean;
  expiry_date?: string;
  view_limit: number;
  current_views: number;
  current_downloads: number;
  allow_download: boolean;
  allow_print: boolean;
  allow_share: boolean;
  device_restriction: string;
  watermark_enabled: boolean;
  status: 'active' | 'expired' | 'limit_reached' | 'revoked' | 'inactive';
  is_active: boolean;
  is_revoked: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  document_id?: string;
  action: string;
  status: string;
  ip_address?: string;
  device_type?: string;
  device_name?: string;
  browser?: string;
  os?: string;
  location?: string;
  details?: string;
  created_at: string;
}

export interface RegisterData {
  full_name: string;
  username: string;
  email: string;
  phone?: string;
  password: string;
  confirm_password: string;
}

export interface LoginData {
  username_or_email: string;
  password: string;
  remember_me?: boolean;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export default api;