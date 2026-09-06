import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token & Tenant Slug
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Dynamic tenant slug detection (from localStorage or subdomain)
    const storedTenant = localStorage.getItem('tenant_slug') || 'sample';
    if (storedTenant) {
      config.headers['x-tenant-slug'] = storedTenant;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle API envelope & unauthenticated states
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token on auth error
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    let message = 'An unexpected error occurred. Please try again.';
    let dependencies = [];
    let errorCode = 'REQUEST_ERROR';

    if (error.response?.data) {
      const data = error.response.data;
      if (typeof data.message === 'string' && data.message.trim()) {
        message = data.message;
      } else if (typeof data.detail === 'string' && data.detail.trim()) {
        message = data.detail;
      } else if (data.detail && typeof data.detail === 'object') {
        if (typeof data.detail.message === 'string') {
          message = data.detail.message;
        }
        if (Array.isArray(data.detail.dependencies)) {
          dependencies = data.detail.dependencies;
        }
      } else if (Array.isArray(data.details?.errors)) {
        message = data.details.errors
          .map((e) => `${(e.loc || []).filter((l) => l !== 'body').join('.') || 'field'}: ${e.msg || 'Invalid value'}`)
          .join('; ');
      }

      if (Array.isArray(data.dependencies)) {
        dependencies = data.dependencies;
      }
      if (data.error_code) {
        errorCode = data.error_code;
      }
    } else if (error.message) {
      message = error.message;
    }

    const err = new Error(message);
    err.dependencies = dependencies;
    err.errorCode = errorCode;
    err.statusCode = error.response?.status;
    err.response = error.response;
    return Promise.reject(err);
  }
);

export default api;
