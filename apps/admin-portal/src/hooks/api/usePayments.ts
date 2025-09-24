import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tabsyClient } from '@tabsy/api-client';
import { useAuth } from '@tabsy/ui-components';
import { Payment, PaymentStatus, PaymentMethod } from '@tabsy/shared-types';
import { toast } from 'sonner';

export function usePayments(filters?: {
  restaurantId?: string;
  status?: PaymentStatus;
  method?: string;
  dateRange?: 'all' | 'today' | 'week' | 'month';
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  sortBy?: 'createdAt' | 'amount' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'payments', filters],
    queryFn: async () => {
      const paymentsResponse = await tabsyClient.payment.getByRestaurant(
        filters?.restaurantId || '', // Empty string for all restaurants
        {
          limit: 1000,
          status: filters?.status,
          dateFrom: filters?.dateFrom?.toISOString(),
          dateTo: filters?.dateTo?.toISOString()
        }
      );

      const payments = paymentsResponse.data || [];
      if (!payments.length) return [];

      let filtered = [...payments];

      // Apply status filter
      if (filters?.status) {
        filtered = filtered.filter(p => p.status === filters.status);
      }

      // Apply method filter
      if (filters?.method) {
        filtered = filtered.filter(p => p.method === filters.method);
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
        filtered = filtered.filter(p => new Date(p.createdAt) >= dateFrom);
      }

      // Apply date filters
      if (filters?.dateFrom) {
        filtered = filtered.filter(p => new Date(p.createdAt) >= filters.dateFrom!);
      }
      if (filters?.dateTo) {
        filtered = filtered.filter(p => new Date(p.createdAt) <= filters.dateTo!);
      }

      // Apply search filter
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(p =>
          p.transactionId?.toLowerCase().includes(searchLower) ||
          p.orderId?.toLowerCase().includes(searchLower)
        );
      }

      // Apply sorting
      if (filters?.sortBy) {
        filtered.sort((a, b) => {
          const order = filters.sortOrder === 'desc' ? -1 : 1;
          switch (filters.sortBy) {
            case 'amount':
              return order * (a.amount - b.amount);
            case 'status':
              return order * a.status.localeCompare(b.status);
            case 'createdAt':
            default:
              return order * (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          }
        });
      }

      // Return filtered payments with statistics
      return {
        payments: filtered,
        stats: {
          paymentsByStatus: filtered.reduce((acc, p) => {
            acc[p.status] = (acc[p.status] || 0) + 1;
            return acc;
          }, {} as Record<PaymentStatus, number>),
          paymentsByMethod: filtered.reduce((acc, p) => {
            acc[p.method] = (acc[p.method] || 0) + 1;
            return acc;
          }, {} as Record<PaymentMethod, number>)
        }
      };
    },
    enabled: isAuthenticated,
    refetchInterval: 30000
  });
}

export function usePayment(paymentId: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'payment', paymentId],
    queryFn: async () => {
      const response = await tabsyClient.payment.getById(paymentId);
      return response.data;
    },
    enabled: isAuthenticated && !!paymentId
  });
}

export function useRefundPayment() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentId, amount, reason }: {
      paymentId: string;
      amount?: number;
      reason?: string;
    }) => {
      // Call refund endpoint
      const response = await tabsyClient.payment.updateStatus(paymentId, PaymentStatus.REFUNDED);
      return response.data;
    },
    onSuccess: (refundedPayment) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      if (refundedPayment) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'payment', refundedPayment.id] });
        toast.success(`Payment refunded successfully! Amount: $${Number((refundedPayment as any).refundAmount || refundedPayment.amount || 0).toFixed(2)}`);
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to refund payment');
    }
  });
}

export function usePaymentMetrics(period: 'today' | 'week' | 'month' | 'quarter' | 'year' = 'today', restaurantId?: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'payments', 'metrics', period, restaurantId],
    queryFn: async () => {
      const response = await tabsyClient.paymentMetrics.getMetricsForPeriod(period, restaurantId, true);
      return response.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 30000
  });
}

export function useRealTimePaymentMetrics(restaurantId?: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'payments', 'metrics', 'realtime', restaurantId],
    queryFn: async () => {
      const response = await tabsyClient.paymentMetrics.getRealTimeMetrics(restaurantId);
      return response.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 5000
  });
}

export function usePaymentHealthStatus(restaurantId?: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'payments', 'health', restaurantId],
    queryFn: async () => {
      const response = await tabsyClient.paymentMetrics.getHealthStatus(restaurantId);
      return response.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 30000
  });
}

export function usePaymentAlerts(restaurantId?: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'payments', 'alerts', restaurantId],
    queryFn: async () => {
      const response = await tabsyClient.paymentMetrics.getAlerts(restaurantId);
      return response.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 15000
  });
}

export function useProcessRefund() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentId, amount, reason }: {
      paymentId: string;
      amount?: number;
      reason?: string;
    }) => {
      // Call refund endpoint
      const response = await tabsyClient.payment.updateStatus(paymentId, PaymentStatus.REFUNDED);
      return response.data;
    },
    onSuccess: (refundedPayment) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      if (refundedPayment) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'payment', refundedPayment.id] });
        toast.success(`Payment refunded successfully! Amount: $${Number((refundedPayment as any).refundAmount || refundedPayment.amount || 0).toFixed(2)}`);
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to process refund');
    }
  });
}

function calculateTopRestaurants(payments: Payment[]): Array<{
  restaurantId: string;
  restaurantName: string;
  revenue: number;
  transactionCount: number;
}> {
  const restaurantMap: Record<string, {
    name: string;
    revenue: number;
    count: number;
  }> = {};

  payments.forEach(payment => {
    const id = payment.restaurantId;
    const name = `Restaurant ${payment.restaurantId || 'Unknown'}`;

    if (!restaurantMap[id]) {
      restaurantMap[id] = { name, revenue: 0, count: 0 };
    }

    restaurantMap[id].revenue += Number(payment.amount || 0);
    restaurantMap[id].count += 1;
  });

  return Object.entries(restaurantMap)
    .map(([restaurantId, data]) => ({
      restaurantId,
      restaurantName: data.name,
      revenue: data.revenue,
      transactionCount: data.count
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
}

export function usePaymentReconciliation(dateRange: { from: Date; to: Date }, restaurantId?: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'payments', 'reconciliation', dateRange, restaurantId],
    queryFn: async () => {
      const response = await tabsyClient.paymentMetrics.getReconciliation(
        dateRange.from.toISOString(),
        dateRange.to.toISOString(),
        restaurantId
      );
      return response.data;
    },
    enabled: isAuthenticated && !!dateRange
  });
}

export function useLivePayments() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'payments', 'live'],
    queryFn: async () => {
      const paymentsResponse = await tabsyClient.payment.getByRestaurant('', { limit: 50 });
      const payments = paymentsResponse.data || [];

      return payments.filter(p =>
        [PaymentStatus.PENDING, PaymentStatus.PROCESSING].includes(p.status)
      ).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    enabled: isAuthenticated,
    refetchInterval: 5000 // Refresh every 5 seconds for live view
  });
}