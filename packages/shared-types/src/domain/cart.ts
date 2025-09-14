import { MenuItem } from './menu'

export interface CartItem {
  id: string
  menuItem: MenuItem
  quantity: number
  basePrice: number
  totalPrice: number
  selectedOptions?: CartItemOption[]
  specialInstructions?: string
}

export interface CartItemOption {
  optionGroupId: string
  optionGroupName: string
  optionId: string
  optionName: string
  price: number
}

export interface CartSummary {
  items: CartItem[]
  subtotal: number
  tax: number
  total: number
  discounts?: CartDiscount[]
}

export interface CartDiscount {
  id: string
  name: string
  amount: number
  type: 'percentage' | 'fixed'
}
