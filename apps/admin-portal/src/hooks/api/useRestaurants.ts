import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tabsyClient } from '@tabsy/api-client';
import { useAuth } from '@tabsy/ui-components';
import { Restaurant, CreateRestaurantRequest, UpdateRestaurantRequest } from '@tabsy/shared-types';
import { toast } from 'sonner';

export function useRestaurants(filters?: {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  sortBy?: 'name' | 'createdAt' | 'revenue';
  sortOrder?: 'asc' | 'desc';
}) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'restaurants', filters],
    queryFn: async () => {
      const restaurantsResponse = await tabsyClient.restaurant.list();
      const restaurants = restaurantsResponse.data || [];

      if (!restaurants) return [];

      let filtered = [...restaurants];

      // Apply search filter
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(r =>
          r.name.toLowerCase().includes(searchLower) ||
          r.description?.toLowerCase().includes(searchLower) ||
          r.address?.toLowerCase().includes(searchLower)
        );
      }

      // Apply status filter
      if (filters?.status && filters.status !== 'all') {
        filtered = filtered.filter(r => {
          switch (filters.status) {
            case 'active':
              return r.active === true;
            case 'inactive':
              return r.active === false;
            default:
              return true;
          }
        });
      }

      // Apply sorting
      if (filters?.sortBy) {
        filtered.sort((a, b) => {
          const order = filters.sortOrder === 'desc' ? -1 : 1;
          switch (filters.sortBy) {
            case 'name':
              return order * a.name.localeCompare(b.name);
            case 'createdAt':
              return order * (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            case 'revenue':
              // This would need actual revenue data
              return 0;
            default:
              return 0;
          }
        });
      }

      return filtered;
    },
    enabled: isAuthenticated
  });
}

export function useRestaurant(restaurantId: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'restaurant', restaurantId],
    queryFn: async () => {
      const response = await tabsyClient.restaurant.getById(restaurantId);
      return response.data;
    },
    enabled: isAuthenticated && !!restaurantId
  });
}

export function useCreateRestaurant() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRestaurantRequest) => {
      const response = await tabsyClient.restaurant.create(data);
      return response.data;
    },
    onSuccess: (newRestaurant) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'restaurants'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      if (newRestaurant) {
        toast.success(`Restaurant "${newRestaurant.name}" created successfully!`);
      } else {
        toast.success('Restaurant created successfully!');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create restaurant');
    }
  });
}

export function useUpdateRestaurant() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRestaurantRequest }) => {
      const response = await tabsyClient.restaurant.update(id, data);
      return response.data;
    },
    onSuccess: (updatedRestaurant) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'restaurants'] });
      if (updatedRestaurant) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', updatedRestaurant.id] });
        toast.success(`Restaurant "${updatedRestaurant.name}" updated successfully!`);
      } else {
        toast.success('Restaurant updated successfully!');
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update restaurant');
    }
  });
}

export function useUpdateRestaurantStatus() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const response = await tabsyClient.restaurant.update(id, { active });
      return response.data;
    },
    onSuccess: (updatedRestaurant) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'restaurants'] });
      if (updatedRestaurant) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', updatedRestaurant.id] });
        const status = updatedRestaurant.active ? 'activated' : 'deactivated';
        toast.success(`Restaurant "${updatedRestaurant.name}" ${status} successfully!`);
      } else {
        toast.success('Restaurant status updated successfully!');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update restaurant status');
    }
  });
}

export function useDeleteRestaurant() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await tabsyClient.restaurant.delete(id);
      return response.data;
    },
    onSuccess: (_, restaurantId) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'restaurants'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      toast.success('Restaurant deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete restaurant');
    }
  });
}

export function useRestaurantStaff(restaurantId: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'restaurant', restaurantId, 'staff'],
    queryFn: async () => {
      // TODO: Implement getStaff endpoint in the API
      // For now, return empty array as placeholder
      return [];
    },
    enabled: isAuthenticated && !!restaurantId
  });
}

export function useAddRestaurantStaff() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ restaurantId, userId }: { restaurantId: string; userId: string }) => {
      const response = await tabsyClient.restaurant.addStaff(restaurantId, { userId, role: 'staff' });
      return response.data;
    },
    onSuccess: (_, { restaurantId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurantId, 'staff'] });
      toast.success('Staff member added successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add staff member');
    }
  });
}

export function useRemoveRestaurantStaff() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ restaurantId, userId }: { restaurantId: string; userId: string }) => {
      const response = await tabsyClient.restaurant.removeStaff(restaurantId, userId);
      return response.data;
    },
    onSuccess: (_, { restaurantId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'restaurant', restaurantId, 'staff'] });
      toast.success('Staff member removed successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove staff member');
    }
  });
}

export function useRestaurantMetrics(restaurantId: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'restaurant', restaurantId, 'metrics'],
    queryFn: async () => {
      // Fetch restaurant-specific metrics
      const [ordersResponse, paymentsResponse, tablesResponse] = await Promise.all([
        tabsyClient.order.list({ restaurantId, limit: 100 }),
        tabsyClient.payment.getByRestaurant(restaurantId, { limit: 100 }),
        tabsyClient.table.list(restaurantId)
      ]);

      const orders = ordersResponse.data || [];
      const payments = paymentsResponse.data || [];
      const tables = tablesResponse.data || [];

      const totalRevenue = payments.reduce((sum: number, payment: any) =>
        payment.status === 'COMPLETED' ? sum + Number(payment.amount || 0) : sum, 0);

      const totalOrders = orders.length;
      const averageOrderValue = totalOrders > 0
        ? totalRevenue / totalOrders
        : 0;

      const tableCount = tables.length;
      const occupiedTables = tables.filter((t: any) => t.status === 'OCCUPIED').length;

      return {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        tableCount,
        occupiedTables,
        occupancyRate: tableCount > 0 ? (occupiedTables / tableCount) * 100 : 0
      };
    },
    enabled: isAuthenticated && !!restaurantId
  });
}

export function useRestaurantDetails(restaurantId: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'restaurant', restaurantId, 'details'],
    queryFn: async () => {
      const response = await tabsyClient.restaurant.getById(restaurantId);
      return response.data;
    },
    enabled: isAuthenticated && !!restaurantId
  });
}

export function useRestaurantOrders(restaurantId: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'restaurant', restaurantId, 'orders'],
    queryFn: async () => {
      const response = await tabsyClient.order.list({ restaurantId, limit: 50 });
      return response.data;
    },
    enabled: isAuthenticated && !!restaurantId
  });
}

export function useRestaurantTables(restaurantId: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'restaurant', restaurantId, 'tables'],
    queryFn: async () => {
      const response = await tabsyClient.table.list(restaurantId);
      return response.data;
    },
    enabled: isAuthenticated && !!restaurantId
  });
}