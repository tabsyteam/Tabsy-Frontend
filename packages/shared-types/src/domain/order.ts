export enum OrderStatus {
  RECEIVED = 'RECEIVED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum OrderType {
  DINE_IN = 'DINE_IN',
  TAKEAWAY = 'TAKEAWAY',
  DELIVERY = 'DELIVERY'
}

export interface Order {
  id: string
  restaurantId: string
  tableId?: string
  customerId?: string
  sessionId?: string
  guestSessionId?: string // Guest session ID from API
  tableSessionId?: string // Table session ID from API
  orderNumber: string
  type?: OrderType // Made optional since API doesn't always include this
  status: OrderStatus
  isLocked?: boolean // Order lock status
  roundNumber?: number // Round number for multi-round ordering
  items: OrderItem[]
  subtotal: string | number // API returns string, but allow number for flexibility
  tax?: string | number // API field name and optional
  taxAmount?: number // Keep for backward compatibility
  serviceChargeAmount?: number // Optional since not in current API
  tip?: string | number // API field name and optional
  tipAmount?: number // Keep for backward compatibility
  discountAmount?: number // Optional since not in current API
  total: string | number // API field name
  totalAmount?: number // Keep for backward compatibility
  specialInstructions?: string
  estimatedPreparationTime?: number // Made optional since not in API
  actualPreparationTime?: number // in minutes
  customerName?: string // From API
  customerEmail?: string // From API
  customerPhone?: string // From API
  // POS Integration fields
  posLastSync?: string | null
  posOrderId?: string | null
  posStatus?: string | null
  // Nested objects from API
  restaurant?: {
    id: string
    name: string
    description?: string
    logo?: string
    address?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
    phoneNumber?: string
    email?: string
    website?: string
    active?: boolean
    posEnabled?: boolean
  }
  table?: {
    id: string
    tableNumber: string
    seats?: number
    restaurantId?: string
    qrCode?: string
    locationDescription?: string
    shape?: string
    status?: string
  }
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface OrderItem {
  id: string
  orderId: string
  menuItemId: string
  menuItem: {
    id: string
    name: string
    description: string
    price?: string | number // API uses price, not basePrice
    basePrice?: number // Keep for backward compatibility
    imageUrl?: string
    categoryId?: string // Category ID for grouping and filtering
    categoryName?: string // Category name for display purposes
  }
  quantity: number
  price?: string | number // API field name
  basePrice?: number // Keep for backward compatibility
  subtotal: string | number // API field name
  totalPrice?: number // Keep for backward compatibility
  specialInstructions?: string
  options?: OrderItemOption[] // Enhanced unified format
  selectedOptions?: SelectedOption[] // Keep for backward compatibility
  status?: OrderItemStatus // Made optional since not in current API
  createdAt: string
  updatedAt: string
}

export enum OrderItemStatus {
  RECEIVED = 'RECEIVED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

// Enhanced unified format for order item options
export interface OrderItemOption {
  optionId: string      // For validation & referential integrity
  valueId: string       // For validation & referential integrity
  optionName: string    // Display name (e.g., "Size")
  valueName: string     // Selected value (e.g., "Large")
  price: number         // Price adjustment
}

// Legacy types - kept for backward compatibility
export interface SelectedOption {
  optionId: string
  optionName: string
  selectedValues: SelectedOptionValue[]
}

export interface SelectedOptionValue {
  valueId: string
  valueName: string
  priceModifier: number
}

export interface CreateOrderRequest {
  restaurantId: string
  tableId?: string
  type: OrderType
  items: CreateOrderItemRequest[]
  specialInstructions?: string
}

export interface CreateOrderItemRequest {
  menuItemId: string
  quantity: number
  specialInstructions?: string
  options?: OrderItemOption[] // Enhanced unified format
  selectedOptions?: SelectedOption[] // Keep for backward compatibility
}

export interface UpdateOrderRequest {
  status?: OrderStatus
  specialInstructions?: string
  estimatedPreparationTime?: number
}

export interface AddOrderItemRequest {
  orderId: string
  menuItemId: string
  quantity: number
  specialInstructions?: string
  selectedOptions?: SelectedOption[]
}

export interface UpdateOrderItemRequest {
  quantity?: number
  specialInstructions?: string
  status?: OrderItemStatus
  selectedOptions?: SelectedOption[]
}

export interface OrderSummary {
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  averageOrderValue: number
  averagePreparationTime: number
  popularItems: PopularItem[]
}

export interface PopularItem {
  menuItemId: string
  menuItemName: string
  orderCount: number
  revenue: number
}
