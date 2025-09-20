import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tabsyClient } from '@tabsy/api-client';
import { useAuth } from '@tabsy/ui-components';
import { User, CreateUserRequest, UpdateUserRequest, UserRole, UserStatus } from '@tabsy/shared-types';
import { toast } from 'sonner';

export function useUsers(filters?: {
  search?: string;
  role?: UserRole | 'all';
  status?: 'active' | 'inactive' | 'all';
  sortBy?: 'name' | 'email' | 'createdAt' | 'role';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}) {
  const { session, isAuthenticated, isLoading: authLoading } = useAuth();

  // Sync authentication token with global API client
  if (session?.token && tabsyClient.getAuthToken() !== session.token) {
    tabsyClient.setAuthToken(session.token);
  }

  const isTokenSynced = Boolean(session?.token && tabsyClient.getAuthToken() === session.token);

  return useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: async () => {
      const response = await tabsyClient.user.list();
      const users = response.data || [];

      if (!users.length) return { users: [], total: 0 };

      let filtered = [...users];

      // Apply search filter
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(u =>
          u.email.toLowerCase().includes(searchLower) ||
          u.firstName?.toLowerCase().includes(searchLower) ||
          u.lastName?.toLowerCase().includes(searchLower)
        );
      }

      // Apply role filter
      if (filters?.role && filters.role !== 'all') {
        filtered = filtered.filter(u => u.role === filters.role);
      }

      // Apply status filter
      if (filters?.status && filters.status !== 'all') {
        filtered = filtered.filter(u => {
          return u.status === filters.status!.toUpperCase();
        });
      }

      // Apply sorting
      if (filters?.sortBy) {
        filtered.sort((a, b) => {
          const order = filters.sortOrder === 'desc' ? -1 : 1;
          switch (filters.sortBy) {
            case 'name':
              const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
              const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
              return order * nameA.localeCompare(nameB);
            case 'email':
              return order * a.email.localeCompare(b.email);
            case 'role':
              return order * a.role.localeCompare(b.role);
            case 'createdAt':
              return order * (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            default:
              return 0;
          }
        });
      }

      // Apply pagination
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginated = filtered.slice(start, end);

      return {
        users: paginated,
        total: filtered.length,
        page,
        pageSize: limit,
        totalPages: Math.ceil(filtered.length / limit)
      };
    },
    enabled: !!session?.token && !authLoading && isTokenSynced
  });
}

export function useUser(userId: string) {
  const { session, isAuthenticated, isLoading: authLoading } = useAuth();

  // Sync authentication token with global API client
  if (session?.token && tabsyClient.getAuthToken() !== session.token) {
    tabsyClient.setAuthToken(session.token);
  }

  const isTokenSynced = Boolean(session?.token && tabsyClient.getAuthToken() === session.token);

  return useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: async () => {
      const response = await tabsyClient.user.getById(userId);
      return response.data;
    },
    enabled: !!session?.token && !authLoading && isTokenSynced && !!userId
  });
}

export function useCreateUser() {
  const { session, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Ensure token is synced before mutations
  if (session?.token && tabsyClient.getAuthToken() !== session.token) {
    tabsyClient.setAuthToken(session.token);
  }

  return useMutation({
    mutationFn: async (data: CreateUserRequest) => {
      const response = await tabsyClient.user.create(data);
      return response.data;
    },
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      if (newUser) {
        toast.success(`User "${newUser.email}" created successfully!`);
      } else {
        toast.success('User created successfully!');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create user');
    }
  });
}

export function useUpdateUser() {
  const { session, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Ensure token is synced before mutations
  if (session?.token && tabsyClient.getAuthToken() !== session.token) {
    tabsyClient.setAuthToken(session.token);
  }

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserRequest }) => {
      const response = await tabsyClient.user.update(id, data);
      return response.data;
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      if (updatedUser) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'user', updatedUser.id] });
        toast.success(`User "${updatedUser.email}" updated successfully!`);
      } else {
        toast.success('User updated successfully!');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  });
}

export function useUpdateUserRole() {
  const { session, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Ensure token is synced before mutations
  if (session?.token && tabsyClient.getAuthToken() !== session.token) {
    tabsyClient.setAuthToken(session.token);
  }

  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const response = await tabsyClient.user.update(id, { role });
      return response.data;
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      if (updatedUser) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'user', updatedUser.id] });
        toast.success(`User role updated to ${updatedUser.role}`);
      } else {
        toast.success('User role updated successfully!');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update user role');
    }
  });
}

export function useDeleteUser() {
  const { session, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Ensure token is synced before mutations
  if (session?.token && tabsyClient.getAuthToken() !== session.token) {
    tabsyClient.setAuthToken(session.token);
  }

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await tabsyClient.user.delete(id);
      return response.data;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      toast.success('User deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  });
}


export function useUserActivity(userId: string) {
  const { session, isAuthenticated, isLoading: authLoading } = useAuth();

  // Sync authentication token with global API client
  if (session?.token && tabsyClient.getAuthToken() !== session.token) {
    tabsyClient.setAuthToken(session.token);
  }

  const isTokenSynced = Boolean(session?.token && tabsyClient.getAuthToken() === session.token);

  return useQuery({
    queryKey: ['admin', 'user', userId, 'activity'],
    queryFn: async () => {
      // This would fetch user activity logs
      // For now, returning mock structure
      const ordersResponse = await tabsyClient.order.list({ customerId: userId, limit: 10 });
      const orders = ordersResponse.data || [];
      const sessions: any[] = []; // Would fetch session logs

      return {
        recentOrders: orders,
        recentSessions: sessions,
        lastLogin: new Date(),
        totalOrders: orders.length,
        totalSpent: orders.reduce((sum: number, o: any) => sum + Number(o.totalAmount || 0), 0)
      };
    },
    enabled: !!session?.token && !authLoading && isTokenSynced && !!userId
  });
}

export function useBulkUserAction() {
  const { session, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Ensure token is synced before mutations
  if (session?.token && tabsyClient.getAuthToken() !== session.token) {
    tabsyClient.setAuthToken(session.token);
  }

  return useMutation({
    mutationFn: async ({ userIds, action, value }: {
      userIds: string[];
      action: 'activate' | 'deactivate' | 'delete' | 'updateRole';
      value?: any;
    }) => {
      const promises = userIds.map(async (id) => {
        let response;
        switch (action) {
          case 'activate':
            response = await tabsyClient.user.updateStatus(id, UserStatus.ACTIVE);
            break;
          case 'deactivate':
            response = await tabsyClient.user.updateStatus(id, UserStatus.INACTIVE);
            break;
          case 'delete':
            response = await tabsyClient.user.delete(id);
            break;
          case 'updateRole':
            response = await tabsyClient.user.update(id, { role: value });
            break;
          default:
            throw new Error('Invalid action');
        }
        return response.data;
      });

      return Promise.all(promises);
    },
    onSuccess: (_, { action, userIds }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });

      const actionText = {
        'activate': 'activated',
        'deactivate': 'deactivated',
        'delete': 'deleted',
        'updateRole': 'updated'
      }[action];

      toast.success(`${userIds.length} users ${actionText} successfully!`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Bulk action failed');
    }
  });
}

export function useUserStats() {
  const { session, isAuthenticated, isLoading: authLoading } = useAuth();

  // Sync authentication token with global API client
  if (session?.token && tabsyClient.getAuthToken() !== session.token) {
    tabsyClient.setAuthToken(session.token);
  }

  const isTokenSynced = Boolean(session?.token && tabsyClient.getAuthToken() === session.token);

  return useQuery({
    queryKey: ['admin', 'users', 'stats'],
    queryFn: async () => {
      const response = await tabsyClient.user.list();
      const users = response.data || [];

      const stats = {
        total: users.length,
        byRole: {
          ADMIN: 0,
          RESTAURANT_OWNER: 0,
          RESTAURANT_STAFF: 0,
          RESTAURANT_ADMIN: 0
        },
        active: 0,
        inactive: 0,
        newThisMonth: 0,
        newToday: 0
      };

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      users.forEach((user: any) => {
        // Count by role
        if (stats.byRole[user.role as keyof typeof stats.byRole] !== undefined) {
          stats.byRole[user.role as keyof typeof stats.byRole]++;
        }

        // Count active/inactive
        if (user.status === 'ACTIVE') {
          stats.active++;
        } else {
          stats.inactive++;
        }

        // Count new users
        const createdAt = new Date(user.createdAt);
        if (createdAt >= thisMonth) {
          stats.newThisMonth++;
        }
        if (createdAt >= today) {
          stats.newToday++;
        }
      });

      return stats;
    },
    enabled: !!session?.token && !authLoading && isTokenSynced
  });
}