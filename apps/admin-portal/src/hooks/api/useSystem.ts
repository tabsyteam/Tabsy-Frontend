import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@tabsy/ui-components';
import { tabsyClient } from '@tabsy/api-client';
import { toast } from 'sonner';

// System Settings Hook
export function useSystemSettings() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'system', 'settings'],
    queryFn: async () => {
      // TODO: Backend needs to implement /admin/system/settings endpoint
      // For now, returning minimal structure
      return {
        id: 'system',
        maintenanceMode: false,
        allowRegistrations: true,
        emailNotifications: true,
        backupSchedule: 'daily',
        maxFileSize: '10MB',
        sessionTimeout: 30,
        apiRateLimit: 1000,
        updatedAt: new Date().toISOString()
      };
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

// System Health Hook - Uses real /health endpoint
export function useSystemHealth() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'system', 'health'],
    queryFn: async () => {
      // Call real health endpoint using environment variable
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/health`);
      const healthData = await response.json();

      // Transform backend health data to expected format
      const memoryUsed = parseFloat(healthData.memory?.used || '0');
      const memoryTotal = parseFloat(healthData.memory?.total || '0');
      const memoryPercent = memoryTotal > 0 ? (memoryUsed / memoryTotal) * 100 : 0;

      return {
        status: healthData.status || 'unknown',
        uptime: healthData.uptime ? `${Math.floor(healthData.uptime / 3600)}h ${Math.floor((healthData.uptime % 3600) / 60)}m` : 'N/A',
        cpuUsage: 'N/A', // Backend doesn't provide CPU usage yet
        memoryUsage: `${memoryPercent.toFixed(1)}%`,
        memory: healthData.memory,
        diskUsage: 'N/A', // Backend doesn't provide disk usage yet
        dbConnections: 'N/A', // Backend doesn't provide this yet
        activeUsers: 'N/A', // Backend doesn't provide this yet
        lastCheck: healthData.timestamp || new Date().toISOString(),
        responseTime: healthData.responseTime || 'N/A',
        version: healthData.version || 'Unknown',
        services: {
          database: healthData.services?.database || 'unknown',
          redis: healthData.services?.redis || 'unknown',
          api: healthData.status === 'healthy' ? 'healthy' : 'unhealthy',
          storage: 'unknown' // Backend doesn't provide this yet
        },
        redis: healthData.redis // Include Redis details if available
      };
    },
    enabled: isAuthenticated
    // Removed refetchInterval - relying on WebSocket events for real-time updates
  });
}

// Audit Logs Hook
export function useAuditLogs(filters?: {
  userId?: string;
  action?: string;
  resource?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'audit-logs', filters],
    queryFn: async () => {
      // TODO: Implement audit logs API call
      // Placeholder data structure
      return [
        {
          id: '1',
          userId: 'user123',
          userEmail: 'admin@tabsy.com',
          action: 'CREATE_RESTAURANT',
          resource: 'restaurant',
          resourceId: 'rest123',
          details: 'Created new restaurant "Test Restaurant"',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          timestamp: new Date().toISOString()
        },
        {
          id: '2',
          userId: 'user456',
          userEmail: 'manager@tabsy.com',
          action: 'UPDATE_ORDER',
          resource: 'order',
          resourceId: 'order456',
          details: 'Updated order status to completed',
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0...',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        }
      ];
    },
    enabled: isAuthenticated,
    staleTime: 60000 // 1 minute
  });
}

// User Orders Hook
export function useUserOrders(userId: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'users', userId, 'orders'],
    queryFn: async () => {
      // TODO: Implement user orders API call
      // Placeholder data structure
      return [
        {
          id: 'order1',
          restaurantId: 'rest1',
          restaurantName: 'Test Restaurant',
          total: 45.99,
          status: 'completed',
          items: 3,
          createdAt: new Date().toISOString()
        },
        {
          id: 'order2',
          restaurantId: 'rest2',
          restaurantName: 'Another Restaurant',
          total: 22.50,
          status: 'cancelled',
          items: 1,
          createdAt: new Date(Date.now() - 86400000).toISOString()
        }
      ];
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

// User Restaurants Hook
export function useUserRestaurants(userId: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'users', userId, 'restaurants'],
    queryFn: async () => {
      // TODO: Implement user restaurants API call
      // Placeholder data structure
      return [
        {
          id: 'rest1',
          name: 'Test Restaurant',
          role: 'owner',
          status: 'active',
          joinedAt: new Date().toISOString()
        },
        {
          id: 'rest2',
          name: 'Another Restaurant',
          role: 'manager',
          status: 'active',
          joinedAt: new Date(Date.now() - 2592000000).toISOString()
        }
      ];
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

// User Metrics Hook
export function useUserMetrics(userId: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'users', userId, 'metrics'],
    queryFn: async () => {
      // TODO: Implement user metrics API call
      // Placeholder data structure
      return {
        totalOrders: 47,
        totalSpent: 1234.56,
        avgOrderValue: 26.27,
        favoriteRestaurant: 'Test Restaurant',
        lastOrderDate: new Date().toISOString(),
        registrationDate: new Date(Date.now() - 7776000000).toISOString(), // 3 months ago
        ordersByStatus: {
          completed: 42,
          cancelled: 3,
          pending: 2
        },
        spendingByMonth: [
          { month: 'Jan', amount: 234.56 },
          { month: 'Feb', amount: 345.67 },
          { month: 'Mar', amount: 654.33 }
        ]
      };
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}