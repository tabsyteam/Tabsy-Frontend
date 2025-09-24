import type { TabsyApiClient } from '../client'
import type {
  ApiResponse,
  PaymentMetrics,
  PaymentReconciliation,
  RealTimePaymentMetrics,
  PaymentAlert,
  PaymentHealthStatus,
  PaymentMetricsQuery
} from '@tabsy/shared-types'

export class PaymentMetricsAPI {
  constructor(private client: TabsyApiClient) {}

  /**
   * GET /payments/metrics - Get comprehensive payment metrics
   */
  async getMetrics(query: PaymentMetricsQuery): Promise<ApiResponse<PaymentMetrics>> {
    const searchParams = new URLSearchParams()
    searchParams.append('startDate', query.startDate)
    searchParams.append('endDate', query.endDate)

    if (query.restaurantId) {
      searchParams.append('restaurantId', query.restaurantId)
    }
    if (query.includeHourlyData !== undefined) {
      searchParams.append('includeHourlyData', query.includeHourlyData.toString())
    }
    if (query.includeTrendData !== undefined) {
      searchParams.append('includeTrendData', query.includeTrendData.toString())
    }

    return this.client.get<PaymentMetrics>(`/payments/metrics?${searchParams.toString()}`)
  }

  /**
   * GET /payments/metrics/realtime - Get real-time payment monitoring data
   */
  async getRealTimeMetrics(restaurantId?: string): Promise<ApiResponse<RealTimePaymentMetrics>> {
    const searchParams = new URLSearchParams()
    if (restaurantId) {
      searchParams.append('restaurantId', restaurantId)
    }

    const queryString = searchParams.toString()
    const url = queryString ? `/payments/metrics/realtime?${queryString}` : '/payments/metrics/realtime'

    return this.client.get<RealTimePaymentMetrics>(url)
  }

  /**
   * GET /payments/reconciliation - Get payment reconciliation data
   */
  async getReconciliation(
    startDate: string,
    endDate: string,
    restaurantId?: string
  ): Promise<ApiResponse<PaymentReconciliation>> {
    const searchParams = new URLSearchParams()
    searchParams.append('startDate', startDate)
    searchParams.append('endDate', endDate)

    if (restaurantId) {
      searchParams.append('restaurantId', restaurantId)
    }

    return this.client.get<PaymentReconciliation>(`/payments/reconciliation?${searchParams.toString()}`)
  }

  /**
   * GET /payments/alerts - Get payment performance alerts
   */
  async getAlerts(restaurantId?: string): Promise<ApiResponse<PaymentAlert[]>> {
    const searchParams = new URLSearchParams()
    if (restaurantId) {
      searchParams.append('restaurantId', restaurantId)
    }

    const queryString = searchParams.toString()
    const url = queryString ? `/payments/alerts?${queryString}` : '/payments/alerts'

    return this.client.get<PaymentAlert[]>(url)
  }

  /**
   * GET /payments/health - Get payment system health status
   */
  async getHealthStatus(restaurantId?: string): Promise<ApiResponse<PaymentHealthStatus>> {
    const searchParams = new URLSearchParams()
    if (restaurantId) {
      searchParams.append('restaurantId', restaurantId)
    }

    const queryString = searchParams.toString()
    const url = queryString ? `/payments/health?${queryString}` : '/payments/health'

    return this.client.get<PaymentHealthStatus>(url)
  }

  /**
   * Get payment metrics for a specific date range with defaults
   */
  async getMetricsForPeriod(
    period: 'today' | 'week' | 'month' | 'quarter' | 'year',
    restaurantId?: string,
    includeTrendData: boolean = true
  ): Promise<ApiResponse<PaymentMetrics>> {
    const now = new Date()
    let startDate: Date
    let endDate = new Date(now)

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'quarter':
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3
        startDate = new Date(now.getFullYear(), quarterStartMonth, 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        throw new Error('Invalid period specified')
    }

    return this.getMetrics({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      restaurantId,
      includeHourlyData: period === 'today' || period === 'week',
      includeTrendData
    })
  }

  /**
   * Get payment health summary (lightweight version)
   */
  async getHealthSummary(restaurantId?: string): Promise<ApiResponse<{
    status: PaymentHealthStatus['status']
    score: number
    alertCount: number
    lastCheck: string
  }>> {
    const response = await this.getHealthStatus(restaurantId)

    if (response.success && response.data) {
      const health = response.data
      return {
        success: true,
        data: {
          status: health.status,
          score: health.score,
          alertCount: health.alerts.total,
          lastCheck: health.lastCheck
        }
      }
    }

    return response as any
  }
}