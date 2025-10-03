import { useQuery } from '@tanstack/react-query';
import { tabsyClient } from '@tabsy/api-client';
import { useAuth } from '@tabsy/ui-components';
import { OrderStatus } from '@tabsy/shared-types';

export function useAnalytics(period: 'today' | 'week' | 'month' | 'year' = 'month') {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'analytics', period],
    queryFn: async () => {
      const now = new Date();
      let dateFrom: Date;
      let previousDateFrom: Date;
      let previousDateTo: Date;

      switch (period) {
        case 'today':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          previousDateFrom = new Date(dateFrom.getTime() - 24 * 60 * 60 * 1000);
          previousDateTo = dateFrom;
          break;
        case 'week':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          previousDateFrom = new Date(dateFrom.getTime() - 7 * 24 * 60 * 60 * 1000);
          previousDateTo = dateFrom;
          break;
        case 'month':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
          previousDateFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          previousDateTo = dateFrom;
          break;
        case 'year':
          dateFrom = new Date(now.getFullYear(), 0, 1);
          previousDateFrom = new Date(now.getFullYear() - 1, 0, 1);
          previousDateTo = dateFrom;
          break;
      }

      // Fetch data from multiple endpoints
      const [ordersResponse, restaurantsResponse, usersResponse] = await Promise.all([
        tabsyClient.order.list({ limit: 10000 }),
        tabsyClient.restaurant.list(),
        tabsyClient.user.list()
      ]);

      // Extract data from API responses
      const orders = ordersResponse.data || [];
      const restaurants = restaurantsResponse.data || [];
      const users = usersResponse.data || [];

      // Fetch payment data from payment endpoints
      const paymentsResponse = await tabsyClient.payment.list({ limit: 10000 });
      const payments = paymentsResponse.data || [];

      // Filter data by period
      const periodOrders = orders?.filter(o =>
        new Date(o.createdAt) >= dateFrom
      ) || [];

      const periodPayments = payments?.filter(p =>
        new Date(p.createdAt) >= dateFrom && p.status === 'completed'
      ) || [];

      const previousOrders = orders?.filter(o =>
        new Date(o.createdAt) >= previousDateFrom &&
        new Date(o.createdAt) < previousDateTo
      ) || [];

      const previousPayments = payments?.filter(p =>
        new Date(p.createdAt) >= previousDateFrom &&
        new Date(p.createdAt) < previousDateTo &&
        p.status === 'completed'
      ) || [];

      // Calculate revenue metrics
      const totalRevenue = periodPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const previousRevenue = previousPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const revenueChange = previousRevenue > 0
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

      // Calculate order metrics
      const totalOrders = periodOrders.length;
      const previousTotalOrders = previousOrders.length;
      const ordersChange = previousTotalOrders > 0
        ? ((totalOrders - previousTotalOrders) / previousTotalOrders) * 100
        : 0;

      // Calculate customer metrics
      const uniqueCustomers = new Set(periodOrders.map(o => o.customerId).filter(Boolean));
      const previousUniqueCustomers = new Set(previousOrders.map(o => o.customerId).filter(Boolean));

      const newCustomers = Array.from(uniqueCustomers).filter(id => {
        const firstOrder = orders?.find(o => o.customerId === id);
        return firstOrder && new Date(firstOrder.createdAt) >= dateFrom;
      }).length;

      // Calculate restaurant metrics
      const activeRestaurants = restaurants?.filter(r => r.active).length || 0;
      const newRestaurants = restaurants?.filter(r =>
        new Date(r.createdAt) >= dateFrom
      ).length || 0;

      // Calculate top restaurants
      const restaurantRevenue: Record<string, { name: string; revenue: number; orders: number }> = {};
      periodOrders.forEach(order => {
        const restaurantId = order.restaurantId;
        if (restaurantId) {
          const restaurant = restaurants?.find(r => r.id === restaurantId);
          if (!restaurantRevenue[restaurantId]) {
            restaurantRevenue[restaurantId] = {
              name: restaurant?.name || 'Unknown',
              revenue: 0,
              orders: 0
            };
          }
          restaurantRevenue[restaurantId].revenue += Number(order.total || 0);
          restaurantRevenue[restaurantId].orders += 1;
        }
      });

      const topRestaurants = Object.values(restaurantRevenue)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map(r => ({
          ...r,
          revenue: r.revenue.toFixed(2),
          growth: 0 // Growth calculation would require historical data comparison
        }));

      // Calculate peak hour
      const hourCounts: Record<number, number> = {};
      periodOrders.forEach(order => {
        const hour = new Date(order.createdAt).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      const peakHour = Object.entries(hourCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || '12';

      // Calculate metrics
      return {
        revenue: {
          total: totalRevenue,
          changePercent: revenueChange,
          previous: previousRevenue
        },
        orders: {
          total: totalOrders,
          changePercent: ordersChange,
          averageValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
          previous: previousTotalOrders
        },
        customers: {
          total: uniqueCustomers.size,
          new: newCustomers,
          returning: uniqueCustomers.size - newCustomers,
          changePercent: previousUniqueCustomers.size > 0
            ? ((uniqueCustomers.size - previousUniqueCustomers.size) / previousUniqueCustomers.size) * 100
            : 0
        },
        restaurants: {
          total: restaurants?.length || 0,
          active: activeRestaurants,
          new: newRestaurants
        },
        topRestaurants,
        customerRetention: 0, // Would require retention tracking implementation
        averageRating: 0, // Would require review/rating system
        peakHour: parseInt(peakHour),
        avgWaitTime: 0, // Would require order timing analysis
        vipCustomers: 0 // Would require VIP customer classification
      };
    },
    enabled: isAuthenticated
    // Removed refetchInterval - relying on WebSocket events for real-time updates
  });
}

export function useAnalyticsRestaurantMetrics(restaurantId?: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'restaurant-metrics', restaurantId],
    queryFn: async () => {
      const [ordersResponse, tablesResponse] = await Promise.all([
        tabsyClient.order.list({ restaurantId, limit: 1000 }),
        tabsyClient.table.list(restaurantId || '')
      ]);

      // Extract data from API responses
      const orders = ordersResponse.data || [];
      const tables = tablesResponse.data || [];

      // Fetch payment data from payment endpoints
      const paymentsResponse = await tabsyClient.payment.list({ limit: 10000 });
      const payments = paymentsResponse.data || [];

      const completedPayments = payments?.filter(p => p.status === 'completed') || [];
      const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      const completedOrders = orders?.filter(o => o.status === OrderStatus.DELIVERED) || [];
      const avgOrderValue = completedOrders.length > 0
        ? totalRevenue / completedOrders.length
        : 0;

      const tableCount = tables?.length || 0;
      const occupiedTables = tables?.filter((t: any) => t.status === 'occupied').length || 0;

      return {
        totalRevenue,
        totalOrders: orders?.length || 0,
        completedOrders: completedOrders.length,
        avgOrderValue,
        tableCount,
        occupiedTables,
        occupancyRate: tableCount > 0 ? (occupiedTables / tableCount) * 100 : 0,
        rating: 0, // Would require review/rating system
        reviewCount: 0
      };
    },
    enabled: isAuthenticated && !!restaurantId
  });
}