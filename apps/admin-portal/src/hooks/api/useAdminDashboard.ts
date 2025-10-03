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

      // The backend returns the dashboard data
      // If chartData is missing, we'll generate it from aggregated data
      const dashboardData = response.data as any;

      // If backend doesn't provide chartData, create empty arrays
      if (!dashboardData.chartData) {
        dashboardData.chartData = {
          revenue: [],
          orders: [],
          users: []
        };
      }

      return dashboardData as DashboardData;
    },
    enabled: isAuthenticated
    // Removed refetchInterval - relying on WebSocket events for real-time updates
  });
}

// Hook to generate user growth data from user list
export function useUserGrowthData() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'user-growth'],
    queryFn: async () => {
      // Fetch all users
      const usersResponse = await tabsyClient.user.list({ limit: 10000 });
      const users = usersResponse.data || [];

      // Group users by month based on createdAt
      const monthlyGrowth = new Map<string, number>();

      users.forEach(user => {
        const date = new Date(user.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyGrowth.set(monthKey, (monthlyGrowth.get(monthKey) || 0) + 1);
      });

      // Convert to cumulative growth array
      const sorted = Array.from(monthlyGrowth.entries()).sort();
      const growthData: Array<{ date: string; count: number }> = [];
      let cumulative = 0;

      sorted.forEach(([monthKey, count]) => {
        cumulative += count;
        growthData.push({
          date: `${monthKey}-01`, // First day of month
          count: cumulative
        });
      });

      // Return last 6 months
      return growthData.slice(-6);
    },
    enabled: isAuthenticated
  });
}