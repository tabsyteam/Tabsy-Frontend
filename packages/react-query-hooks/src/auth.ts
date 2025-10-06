import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  User, 
  UserRole,
  UserStatus,
  LoginCredentials, 
  RegisterData, 
  LoginResponse, 
  RefreshTokenResponse,
  AuthError 
} from '@tabsy/shared-types';
import { createTabsyClient, tabsyClient } from '@tabsy/api-client';

// Get API base URL from environment or use global client's baseURL
function getAPIBaseURL(): string {
  // Try to get from environment (works in Next.js apps)
  if (typeof window !== 'undefined' && (window as any).process?.env?.NEXT_PUBLIC_API_BASE_URL) {
    return (window as any).process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  // Fallback: use global client which gets URL from app config
  return tabsyClient.axios.defaults.baseURL || '';
}

// Create API client instance for auth operations
const apiClient = createTabsyClient({
  baseURL: getAPIBaseURL(),
  timeout: 10000
});

// Real API functions using Tabsy API Client
const authApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await apiClient.auth.login(credentials);
    
    // Store auth token in both clients for subsequent requests
    if (response.token) {
      apiClient.setAuthToken(response.token);
      tabsyClient.setAuthToken(response.token); // Set on global client too
    }
    
    return response;
  },

  register: async (data: RegisterData): Promise<LoginResponse> => {
    const response = await apiClient.auth.register(data);
    
    // Store auth token in both clients for subsequent requests
    if (response.token) {
      apiClient.setAuthToken(response.token);
      tabsyClient.setAuthToken(response.token); // Set on global client too
    }
    
    return response;
  },

  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const response = await apiClient.auth.refreshToken(refreshToken);
    
    // Update auth token in both clients
    if (response.token) {
      apiClient.setAuthToken(response.token);
      tabsyClient.setAuthToken(response.token); // Set on global client too
    }
    
    return response;
  },

  getCurrentUser: async (): Promise<User> => {
    // First try to get token from localStorage and set it in both clients
    const storedToken = localStorage.getItem('tabsy-token');
    if (storedToken) {
      apiClient.setAuthToken(storedToken);
      tabsyClient.setAuthToken(storedToken); // Set on global client too
    }
    
    const response = await apiClient.user.getCurrentUser();
    return response.data!;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.auth.logout();
    } finally {
      // Always clear local data regardless of API call success
      localStorage.removeItem('tabsy-user');
      localStorage.removeItem('tabsy-token');
      localStorage.removeItem('tabsy-refresh-token');
      apiClient.clearAuthToken();
      tabsyClient.clearAuthToken(); // Clear from global client too
    }
  },
};

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
};

// Custom hooks
export function useLogin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data: LoginResponse) => {
      // Store auth data
      localStorage.setItem('tabsy-user', JSON.stringify(data.user));
      localStorage.setItem('tabsy-token', data.token);
      if (data.refreshToken) {
        localStorage.setItem('tabsy-refresh-token', data.refreshToken);
      }
      
      // Update query cache
      queryClient.setQueryData(authKeys.user(), data.user);
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
    onError: (error: Error) => {
      console.error('Login failed:', error.message);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data: LoginResponse) => {
      // Store auth data
      localStorage.setItem('tabsy-user', JSON.stringify(data.user));
      localStorage.setItem('tabsy-token', data.token);
      if (data.refreshToken) {
        localStorage.setItem('tabsy-refresh-token', data.refreshToken);
      }
      
      // Update query cache
      queryClient.setQueryData(authKeys.user(), data.user);
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
    onError: (error: Error) => {
      console.error('Registration failed:', error.message);
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: authApi.getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // Clear query cache
      queryClient.setQueryData(authKeys.user(), null);
      queryClient.removeQueries({ queryKey: authKeys.all });
      queryClient.clear();
    },
    onError: (error: Error) => {
      console.error('Logout failed:', error.message);
    },
  });
}

export function useRefreshToken() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: authApi.refreshToken,
    onSuccess: (data: RefreshTokenResponse) => {
      localStorage.setItem('tabsy-token', data.token);
      // Invalidate current user query to refetch with new token
      queryClient.invalidateQueries({ queryKey: authKeys.user() });
    },
  });
}

// Utility hook to check authentication status
export function useAuth() {
  const { data: user, isLoading, error } = useCurrentUser();
  
  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
  };
}
