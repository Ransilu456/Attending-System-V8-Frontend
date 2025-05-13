import axios from 'axios';
import ToastHelper from '../components/ToastHelper';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

const isUserAdmin = () => {
  try {
    let userStr = localStorage.getItem('user');
  
    if (!userStr) {
      userStr = sessionStorage.getItem('user');
    }
    
    if (!userStr) return false;
    
    const user = JSON.parse(userStr);

    return user.role === 'admin' || 
           user.role === 'superadmin' || 
           user.isAdmin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

api.interceptors.request.use(
  async (config) => {

    // Get token from both localStorage and sessionStorage
    const localToken = localStorage.getItem('token');
    const sessionToken = sessionStorage.getItem('token');
    const token = localToken || sessionToken;
    
    // Log token details for debugging (remove in production)
    console.log('API Request:', {
      url: config.url,
      hasLocalToken: !!localToken,
      hasSessionToken: !!sessionToken, 
      tokenUsed: !!token
    });
    
    // If token exists, attach it to the request headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('No token found for request to:', config.url);
    }
    
    // For sensitive operations that require admin privileges, check before sending
    const adminRequiredPaths = [
      '/attendance/student/.+/record/',  // Delete attendance record
      '/attendance/student/.+/clear',    // Clear attendance history
      '/admin/students',                 // Student management
      '/admin/whatsapp'                  // WhatsApp management
    ];
    
    // Explicitly allow these paths for all authenticated users
    const allowedForAuthenticatedPaths = [
      '/admin/profile',       // Profile update
      '/admin/me',            // Get user profile
      '/admin/update-password' // Password update
    ];
    
    // Get the path without query parameters
    const requestPath = config.url.split('?')[0];
    
    // Check if the current request path matches any admin-required paths
    const isAdminRequired = adminRequiredPaths.some(path => {
      const pattern = new RegExp(path);
      return pattern.test(requestPath);
    });
    
    // Check if path is explicitly allowed for authenticated users
    const isAllowedForAuthenticated = allowedForAuthenticatedPaths.some(path => {
      return requestPath.includes(path);
    });
    
    // If admin privileges are required but user is not admin (and path is not in allowed list)
    if (isAdminRequired && !isUserAdmin() && !isAllowedForAuthenticated) {
      console.log('Admin privileges required for:', requestPath, 'User is admin:', isUserAdmin());
      return Promise.reject({
        response: {
          status: 403,
          data: { message: 'Admin privileges required for this operation' }
        }
      });
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // No response from server
    if (!error.response) {
      ToastHelper.error('Network error. Please check your connection and try again.');
      return Promise.reject(error);
    }

    const { response: errorResponse } = error;
    
    // Handle 401 Unauthorized errors
    if (errorResponse.status === 401) {
      // Prevent redirect loops by checking current URL and frequency of redirects
      const isLoginPage = window.location.pathname.includes('/login');
      
      // Don't redirect if already on login page
      if (!isLoginPage) {
        // Use a counter in localStorage to prevent infinite redirect loops
        const redirectCount = parseInt(localStorage.getItem('auth_redirect_count') || '0');
        const redirectTimestamp = parseInt(localStorage.getItem('auth_redirect_timestamp') || '0');
        const now = Date.now();
        
        // Reset counter if last redirect was more than 10 seconds ago
        if (now - redirectTimestamp > 10000) {
          localStorage.setItem('auth_redirect_count', '1');
          localStorage.setItem('auth_redirect_timestamp', now.toString());
          
          // Only redirect if we haven't redirected too many times
          ToastHelper.error('Your session has expired. Please log in again.');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          setTimeout(() => {
            window.location.href = '/login';
          }, 1000);
        } else if (redirectCount < 3) {
          // Increment counter and redirect
          localStorage.setItem('auth_redirect_count', (redirectCount + 1).toString());
          localStorage.setItem('auth_redirect_timestamp', now.toString());
          
          ToastHelper.error('Your session has expired. Please log in again.');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          setTimeout(() => {
            window.location.href = '/login';
          }, 1000);
        } else {
          // Too many redirects, just show error without redirecting
          console.error('Authentication error detected, but prevented redirect loop');
          ToastHelper.error('Authentication error. Please refresh the page and try logging in again.');
        }
      }
    }
    
    // Handle 403 Forbidden errors (admin privileges required)
    if (errorResponse.status === 403) {
      ToastHelper.error('You do not have permission to perform this action');
    }
    
    // Add specific error handling for QR code related errors
    if (errorResponse.status === 404 && errorResponse.config.url.includes('/qr')) {
      ToastHelper.error(errorResponse.data?.message || 'QR code not found or expired');
      return Promise.reject(error);
    }
    
    // Add specific handling for WhatsApp service errors
    if (errorResponse.status === 503 && errorResponse.config.url.includes('/whatsapp')) {
      ToastHelper.error(errorResponse.data?.message || 'WhatsApp service not available. Please scan QR code to connect.');
      return Promise.reject(error);
    }
    
    if (errorResponse.status === 400 && errorResponse.config.url.includes('/reports/')) {
      const message = errorResponse.data?.message || 'Invalid report parameters';
      
      if (errorResponse.data?.error === 'future_date') {
        ToastHelper.error('Cannot generate reports for future dates');
      } else {
        ToastHelper.error(message);
      }
      return Promise.reject(error);
    }
    
    if (errorResponse.status === 422) {
      ToastHelper.error(errorResponse.data?.message || 'Validation error');
      return Promise.reject(error);
    }
    
    if (errorResponse.status >= 500) {
      ToastHelper.error('Server error. Please try again later or contact support.');
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
);

export default api;