'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWebSocket, useWebSocketEvent } from '@tabsy/api-client'
import { useCart } from '@/hooks/useCart'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { TabsyAPI } from '@tabsy/api-client'
import type {
  TableSessionUser,
  MultiUserTableSession
} from '@tabsy/shared-types'

interface SharedCartViewProps {
  tableSession: MultiUserTableSession
  currentUser: TableSessionUser
  users: TableSessionUser[]
  api: TabsyAPI
}

interface SharedCartItem {
  menuItemId: string
  name: string
  quantity: number
  price: number
  subtotal: number
  options?: any[]
  addedBy: {
    guestSessionId: string
    userName: string
  }
}

interface CartState {
  items: SharedCartItem[]
  total: number
  isLocked: boolean
  currentRound: number
}

export function SharedCartView({ tableSession, currentUser, users, api }: SharedCartViewProps) {
  const [cartState, setCartState] = useState<CartState>({
    items: [],
    total: 0,
    isLocked: false,
    currentRound: 1
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)

  const { items: localCartItems, clearCart } = useCart()

  // Set up WebSocket connection for shared cart
  const { client, emit } = useWebSocket({
    auth: {
      namespace: 'customer',
      restaurantId: tableSession.restaurantId,
      tableId: tableSession.tableId,
      sessionId: currentUser.guestSessionId
    },
    autoConnect: true
  })

  // Handle real-time cart updates from other users
  const handleCartUpdated = useCallback((data: any) => {
    if (data.tableSessionId === tableSession.id) {
      console.log('[SharedCartView] Cart updated by:', data.updatedBy.userName)

      setCartState(prev => ({
        ...prev,
        items: data.cartItems.map((item: any) => ({
          ...item,
          addedBy: data.updatedBy
        })),
        total: data.cartTotal
      }))

      // Show notification if updated by someone else
      if (data.updatedBy.guestSessionId !== currentUser.guestSessionId) {
        toast.info(`${data.updatedBy.userName} updated the cart`)
      }
    }
  }, [tableSession.id, currentUser.guestSessionId])

  // Handle order locking
  const handleOrderLocked = useCallback((data: any) => {
    if (data.tableSessionId === tableSession.id) {
      console.log('[SharedCartView] Order locked by:', data.lockedBy.userName)

      setCartState(prev => ({
        ...prev,
        isLocked: true
      }))

      if (data.lockedBy.guestSessionId !== currentUser.guestSessionId) {
        toast.info(`${data.lockedBy.userName} is placing the order`)
      }
    }
  }, [tableSession.id, currentUser.guestSessionId])

  // Handle new round starting
  const handleNewRound = useCallback((data: any) => {
    if (data.tableSessionId === tableSession.id) {
      console.log('[SharedCartView] New round started:', data.roundNumber)

      setCartState(prev => ({
        ...prev,
        items: [],
        total: 0,
        isLocked: false,
        currentRound: data.roundNumber
      }))

      toast.success(`Round ${data.roundNumber} started! You can add more items.`)
    }
  }, [tableSession.id])

  // Set up WebSocket event listeners with useWebSocketEvent hooks
  useWebSocketEvent(client, 'table:cart_updated', handleCartUpdated, [handleCartUpdated])
  useWebSocketEvent(client, 'table:order_locked', handleOrderLocked, [handleOrderLocked])
  useWebSocketEvent(client, 'table:new_round', handleNewRound, [handleNewRound])

  // Sync local cart changes to shared cart
  const syncCartToShared = useCallback(async () => {
    if (cartState.isLocked || localCartItems.length === 0) return

    try {
      const sharedItems: SharedCartItem[] = localCartItems.map(item => ({
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        options: item.options,
        addedBy: {
          guestSessionId: currentUser.guestSessionId,
          userName: currentUser.userName
        }
      }))

      const total = sharedItems.reduce((sum, item) => sum + item.subtotal, 0)

      // Emit cart update via WebSocket
      emit('table:cart_updated', {
        tableSessionId: tableSession.id,
        tableId: tableSession.tableId,
        updatedBy: {
          guestSessionId: currentUser.guestSessionId,
          userName: currentUser.userName
        },
        cartItems: sharedItems,
        cartTotal: total
      })

      // Update local state
      setCartState(prev => ({
        ...prev,
        items: sharedItems,
        total
      }))

    } catch (error) {
      console.error('[SharedCartView] Error syncing cart:', error)
      toast.error('Failed to sync cart changes')
    }
  }, [cartState.isLocked, localCartItems, currentUser, tableSession, emit])

  // Auto-sync when local cart changes
  useEffect(() => {
    const syncTimer = setTimeout(() => {
      syncCartToShared()
    }, 1000) // Debounce cart updates

    return () => clearTimeout(syncTimer)
  }, [localCartItems, syncCartToShared])

  // Place order and lock cart
  const placeOrder = async () => {
    if (cartState.items.length === 0) {
      toast.error('Cart is empty')
      return
    }

    if (cartState.isLocked) {
      toast.error('Order is already being placed')
      return
    }

    try {
      setIsPlacingOrder(true)

      // First, lock the order
      const lockResponse = await api.tableSession.lockOrder(tableSession.id, {
        guestSessionId: currentUser.guestSessionId
      })

      if (!lockResponse.success) {
        throw new Error('Failed to lock order')
      }

      // Create order with all cart items
      const orderItems = cartState.items.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        options: item.options?.map((opt: any) => ({
          optionId: opt.optionId,
          valueId: opt.valueId
        })) || []
      }))

      const orderResponse = await api.order.create({
        restaurantId: tableSession.restaurantId,
        tableId: tableSession.tableId,
        tableSessionId: tableSession.id,
        guestSessionId: currentUser.guestSessionId,
        roundNumber: cartState.currentRound,
        items: orderItems,
        customerName: currentUser.userName
      })

      if (orderResponse.success) {
        // Clear local cart
        clearCart()

        // Update cart state
        setCartState(prev => ({
          ...prev,
          items: [],
          total: 0,
          isLocked: true
        }))

        toast.success('Order placed successfully!')
      } else {
        throw new Error(orderResponse.error?.message || 'Failed to place order')
      }

    } catch (error) {
      console.error('[SharedCartView] Error placing order:', error)
      toast.error('Failed to place order')
    } finally {
      setIsPlacingOrder(false)
    }
  }

  // Get user name by session ID
  const getUserName = (guestSessionId: string) => {
    const user = users.find(u => u.guestSessionId === guestSessionId)
    return user?.userName || 'Unknown'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Round Info */}
      <div className="bg-surface-secondary rounded-lg p-3">
        <div className="flex justify-between items-center">
          <span className="font-medium">Round {cartState.currentRound}</span>
          {cartState.isLocked && (
            <span className="bg-warning text-warning-foreground px-2 py-1 rounded text-xs">
              ORDERING...
            </span>
          )}
        </div>
      </div>

      {/* Active Users */}
      <div className="bg-surface-secondary rounded-lg p-3">
        <h3 className="font-medium mb-2">People at table ({users.length})</h3>
        <div className="flex flex-wrap gap-2">
          {users.map(user => (
            <div
              key={user.guestSessionId}
              className={`px-2 py-1 rounded text-xs ${
                user.guestSessionId === currentUser.guestSessionId
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-surface border border-default'
              }`}
            >
              {user.userName} {user.isHost && '👑'}
            </div>
          ))}
        </div>
      </div>

      {/* Shared Cart Items */}
      <div className="bg-surface rounded-lg border border-default">
        <div className="p-4 border-b border-default">
          <h3 className="font-medium">Shared Cart</h3>
        </div>

        {cartState.items.length === 0 ? (
          <div className="p-8 text-center text-content-secondary">
            <div className="text-4xl mb-2">🛒</div>
            <p>No items in cart yet</p>
            <p className="text-sm">Add items from the menu to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-default">
            {cartState.items.map((item, index) => (
              <div key={`${item.menuItemId}-${index}`} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-content-secondary">
                      Added by {item.addedBy.userName}
                    </p>
                    {item.options && item.options.length > 0 && (
                      <div className="text-xs text-content-tertiary mt-1">
                        {item.options.map((opt: any, i: number) => (
                          <span key={i}>
                            {opt.name}: {opt.value}
                            {i < item.options.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${item.subtotal.toFixed(2)}</div>
                    <div className="text-sm text-content-secondary">
                      Qty: {item.quantity}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cart Total */}
        {cartState.items.length > 0 && (
          <div className="p-4 border-t border-default bg-surface-secondary">
            <div className="flex justify-between items-center font-medium">
              <span>Total</span>
              <span>${cartState.total.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {cartState.items.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={placeOrder}
            disabled={cartState.isLocked || isPlacingOrder}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPlacingOrder ? (
              <div className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" />
                Placing Order...
              </div>
            ) : cartState.isLocked ? (
              'Order Being Placed...'
            ) : (
              `Place Order • $${cartState.total.toFixed(2)}`
            )}
          </button>

          {cartState.isLocked && (
            <p className="text-center text-sm text-content-secondary">
              {currentUser.userName} is placing the order for everyone
            </p>
          )}
        </div>
      )}

      {/* Instructions */}
      {cartState.items.length === 0 && (
        <div className="bg-info/10 border border-info/20 rounded-lg p-4">
          <h4 className="font-medium text-info mb-2">How it works</h4>
          <ul className="text-sm text-content-secondary space-y-1">
            <li>• Add items to your cart from the menu</li>
            <li>• Everyone at the table sees the same cart</li>
            <li>• Anyone can place the order for the whole table</li>
            <li>• You can order multiple rounds during your meal</li>
          </ul>
        </div>
      )}
    </div>
  )
}