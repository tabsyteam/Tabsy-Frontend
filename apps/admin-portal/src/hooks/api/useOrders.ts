import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tabsyClient } from '@tabsy/api-client';
import { useAuth } from '@tabsy/ui-components';
import { Order, OrderStatus, UpdateOrderRequest } from '@tabsy/shared-types';
import { toast } from 'sonner';

export function useOrders(filters?: {
  restaurantId?: string;
  status?: OrderStatus;
  dateFrom?: Date;
  dateTo?: Date;
  dateRange?: 'all' | 'today' | 'week' | 'month';
  search?: string;
  sortBy?: 'createdAt' | 'total' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'orders', filters],
    queryFn: async () => {
      const ordersResponse = await tabsyClient.order.list({
        restaurantId: filters?.restaurantId,
        limit: 1000 // Get more orders for admin view
      });

      const orders = ordersResponse.data || [];
      if (!orders.length) return [];

      let filtered = [...orders];

      // Apply status filter
      if (filters?.status) {
        filtered = filtered.filter(o => o.status === filters.status);
      }

      // Apply date range filter
      if (filters?.dateRange && filters.dateRange !== 'all') {
        const now = new Date();
        let dateFrom: Date;

        switch (filters.dateRange) {
          case 'today':
            dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          default:
            dateFrom = new Date(0);
        }
        filtered = filtered.filter(o => new Date(o.createdAt) >= dateFrom);
      }

      // Apply date filters
      if (filters?.dateFrom) {
        filtered = filtered.filter(o => new Date(o.createdAt) >= filters.dateFrom!);
      }
      if (filters?.dateTo) {
        filtered = filtered.filter(o => new Date(o.createdAt) <= filters.dateTo!);
      }

      // Apply search filter
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(o =>
          o.id?.toLowerCase().includes(searchLower) ||
          o.customerId?.toLowerCase().includes(searchLower) ||
          o.tableId?.toLowerCase().includes(searchLower)
        );
      }

      // Apply sorting
      if (filters?.sortBy) {
        filtered.sort((a, b) => {
          const order = filters.sortOrder === 'desc' ? -1 : 1;
          switch (filters.sortBy) {
            case 'total':
              return order * (Number(a.total || 0) - Number(b.total || 0));
            case 'status':
              return order * a.status.localeCompare(b.status);
            case 'createdAt':
            default:
              return order * (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          }
        });
      }

      // Return filtered orders (pagination will be handled in the component)
      return filtered;
    },
    enabled: isAuthenticated,
    refetchInterval: 30000 // Refresh every 30 seconds
  });
}

export function useOrder(orderId: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'order', orderId],
    queryFn: async () => {
      const response = await tabsyClient.order.getById(orderId);
      return response.data;
    },
    enabled: isAuthenticated && !!orderId,
    refetchInterval: 10000 // Refresh every 10 seconds for real-time updates
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const response = await tabsyClient.order.update(orderId, { status });
      return response.data;
    },
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      if (updatedOrder) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'order', updatedOrder.id] });
        toast.success(`Order #${updatedOrder.id.slice(-8)} status updated to ${updatedOrder.status}`);
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update order status');
    }
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await tabsyClient.order.cancel(id);
      return { orderId: id };
    },
    onSuccess: ({ orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      toast.success(`Order #${orderId.slice(-8)} cancelled successfully`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    }
  });
}

export function useOrderMetrics() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'orders', 'metrics'],
    queryFn: async () => {
      const now = new Date();
      const dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const ordersResponse = await tabsyClient.order.list({ limit: 10000 });
      const orders = ordersResponse.data || [];

      const todayOrders = orders?.filter(o =>
        new Date(o.createdAt) >= dateFrom
      ) || [];

      const metrics = {
        totalOrders: todayOrders.length,
        activeOrders: todayOrders.filter(o =>
          [OrderStatus.RECEIVED, OrderStatus.PREPARING].includes(o.status)
        ).length,
        pendingOrders: todayOrders.filter(o => o.status === OrderStatus.RECEIVED).length,
        totalRevenue: todayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0),
        averageOrderValue: todayOrders.length > 0
          ? todayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0) / todayOrders.length
          : 0,
        completedOrders: todayOrders.filter(o => o.status === OrderStatus.DELIVERED).length,
        cancelledOrders: todayOrders.filter(o => o.status === OrderStatus.CANCELLED).length,
        completionRate: todayOrders.length > 0
          ? (todayOrders.filter(o => o.status === OrderStatus.DELIVERED).length / todayOrders.length) * 100
          : 0,
        peakHour: calculatePeakHour(todayOrders),
        popularItems: calculatePopularItems(todayOrders)
      };

      return metrics;
    },
    enabled: isAuthenticated
  });
}

function calculatePeakHour(orders: Order[]): number {
  const hourCounts: Record<number, number> = {};

  orders.forEach(order => {
    const hour = new Date(order.createdAt).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  let peakHour = 0;
  let maxCount = 0;

  Object.entries(hourCounts).forEach(([hour, count]) => {
    if (count > maxCount) {
      maxCount = count;
      peakHour = parseInt(hour);
    }
  });

  return peakHour;
}

function calculatePopularItems(orders: Order[]): Array<{ name: string; count: number }> {
  const itemCounts: Record<string, number> = {};

  orders.forEach(order => {
    order.items?.forEach(item => {
      const name = item.menuItem?.name || 'Unknown Item';
      itemCounts[name] = (itemCounts[name] || 0) + item.quantity;
    });
  });

  return Object.entries(itemCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function useLiveOrders() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'orders', 'live'],
    queryFn: async () => {
      const ordersResponse = await tabsyClient.order.list({ limit: 100 });
      const orders = ordersResponse.data || [];

      const liveOrders = orders.filter(o =>
        [OrderStatus.RECEIVED, OrderStatus.PREPARING, OrderStatus.READY].includes(o.status)
      );

      return liveOrders.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    },
    enabled: isAuthenticated,
    refetchInterval: 5000 // Refresh every 5 seconds for live view
  });
}

export function useOrderPayment(orderId: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'order', orderId, 'payment'],
    queryFn: async () => {
      const response = await tabsyClient.payment.getByOrder(orderId);
      // Return the first payment for the order, or null if no payments
      return response.data && response.data.length > 0 ? response.data[0] : null;
    },
    enabled: isAuthenticated && !!orderId
  });
}