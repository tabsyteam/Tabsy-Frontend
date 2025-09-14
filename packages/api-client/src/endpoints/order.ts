import type { TabsyApiClient } from '../client'
import type {
  ApiResponse,
  Order,
  OrderItem,
  OrderStatus,
  CreateOrderRequest,
  UpdateOrderRequest,
  CreateOrderItemRequest,
  UpdateOrderItemRequest
} from '@tabsy/shared-types'

export interface OrderListFilters {
  restaurantId?: string
  tableId?: string
  customerId?: string
  status?: OrderStatus
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export class OrderAPI {
  constructor(private client: TabsyApiClient) {}

  /**
   * GET /orders/ - List orders (admin/staff)
   */
  async list(filters?: OrderListFilters): Promise<ApiResponse<Order[]>> {
    const params = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          // Map restaurantId to restaurant to match server API
          const paramKey = key === 'restaurantId' ? 'restaurant' : key
          params.append(paramKey, value.toString())
        }
      })
    }
    
    const url = `/orders${params.toString() ? `?${params.toString()}` : ''}`
    return this.client.get(url)
  }

  /**
   * GET /orders/:id - Get order by ID
   */
  async getById(id: string): Promise<ApiResponse<Order>> {
    return this.client.get(`/orders/${id}`)
  }

  /**
   * POST /orders/ - Create order
   */
  async create(data: CreateOrderRequest): Promise<ApiResponse<Order>> {
    return this.client.post('/orders', data)
  }

  /**
   * PUT /orders/:id - Update order
   */
  async update(id: string, data: UpdateOrderRequest): Promise<ApiResponse<Order>> {
    return this.client.put(`/orders/${id}`, data)
  }

  /**
   * DELETE /orders/:id - Cancel order
   */
  async cancel(id: string): Promise<ApiResponse<void>> {
    return this.client.delete(`/orders/${id}`)
  }

  /**
   * POST /orders/:id/items - Add order item
   */
  async addItem(orderId: string, data: CreateOrderItemRequest): Promise<ApiResponse<OrderItem>> {
    return this.client.post(`/orders/${orderId}/items`, data)
  }

  /**
   * PUT /orders/:id/items/:itemId - Update order item
   */
  async updateItem(
    orderId: string, 
    itemId: string, 
    data: UpdateOrderItemRequest
  ): Promise<ApiResponse<OrderItem>> {
    return this.client.put(`/orders/${orderId}/items/${itemId}`, data)
  }

  /**
   * DELETE /orders/:id/items/:itemId - Remove order item
   */
  async removeItem(orderId: string, itemId: string): Promise<ApiResponse<void>> {
    return this.client.delete(`/orders/${orderId}/items/${itemId}`)
  }

  /**
   * Helper method: Update order status
   */
  async updateStatus(orderId: string, status: OrderStatus): Promise<ApiResponse<Order>> {
    return this.update(orderId, { status })
  }

  /**
   * Helper method: Get orders for a restaurant
   */
  async getByRestaurant(restaurantId: string, filters?: Omit<OrderListFilters, 'restaurantId'>): Promise<ApiResponse<Order[]>> {
    return this.list({ ...filters, restaurantId })
  }

  /**
   * Helper method: Get orders for a table
   */
  async getByTable(tableId: string, filters?: Omit<OrderListFilters, 'tableId'>): Promise<ApiResponse<Order[]>> {
    return this.list({ ...filters, tableId })
  }
}
