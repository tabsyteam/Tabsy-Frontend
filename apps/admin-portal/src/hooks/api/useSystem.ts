import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@tabsy/ui-components';

// System Health Hook - Uses real /health endpoint
export function useSystemHealth() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin', 'system', 'health'],
    queryFn: async () => {
      // Call real health endpoint - health is at root, not under /api/v1
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001/api/v1';
      // Extract just the base URL without the /api/v1 path
      const baseUrl = apiBaseUrl.replace('/api/v1', '');
      const response = await fetch(`${baseUrl}/health`);

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

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
