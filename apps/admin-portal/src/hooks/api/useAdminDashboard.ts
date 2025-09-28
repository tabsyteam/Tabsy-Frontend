import { useQuery } from '@tanstack/react-query';
import { tabsyClient } from '@tabsy/api-client';
import { useAuth } from '@tabsy/ui-components';

interface DashboardMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  totalRestaurants: number;
  restaurantsGrowth: number;
  totalUsers: number;
  usersGrowth: number;
  systemLoad: number;
  systemLoadStatus: 'normal' | 'elevated' | 'critical';
  ordersToday: number;
  ordersGrowth: number;
  activeOrders: number;
  averageOrderValue: number;
}

interface RestaurantStatus {
  active: number;
  inactive: number;
  pending: number;
  suspended: number;
}

interface RecentActivity {
  id: string;
  type: 'restaurant' | 'user' | 'order' | 'payment' | 'system';
  title: string;
  description: string;
  timestamp: Date;
  status?: 'success' | 'warning' | 'error' | 'info';
}

interface DashboardData {
  metrics: DashboardMetrics;
  restaurantStatus: RestaurantStatus;
  recentActivity: RecentActivity[];
  chartData: {
    revenue: Array<{ date: string; amount: number }>;
    orders: Array<{ date: string; count: number }>;
    users: Array<{ date: string; count: number }>;
  };
}

export function useAdminDashboard() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async (): Promise<DashboardData> => {
      // Simple API call to the backend admin endpoint
      const response = await tabsyClient.admin.getDashboardMetrics();

      // The backend now returns the exact structure we need
      return response.data as DashboardData;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: isAuthenticated
  });
}