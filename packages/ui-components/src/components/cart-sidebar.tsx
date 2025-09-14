import * as React from 'react'
import { ShoppingCart, Minus, Plus, X } from 'lucide-react'
import { CartItem } from '@tabsy/shared-types'
import { formatCurrency } from '@tabsy/shared-utils'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Button } from './button'

interface CartSidebarProps {
  items: CartItem[]
  isOpen: boolean
  onClose: () => void
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onRemoveItem: (itemId: string) => void
  onCheckout: () => void
  isLoading?: boolean
  className?: string
}

export const CartSidebar = React.forwardRef<HTMLDivElement, CartSidebarProps>(
  ({ 
    items, 
    isOpen, 
    onClose, 
    onUpdateQuantity, 
    onRemoveItem, 
    onCheckout, 
    isLoading = false,
    className 
  }, ref) => {
    const totalAmount = items.reduce((sum, item) => sum + (item.totalPrice * item.quantity), 0)
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

    if (!isOpen) return null

    return (
      <div className="fixed inset-0 z-50 lg:relative lg:inset-auto">
        {/* Overlay */}
        <div 
          className="absolute inset-0 bg-black/50 lg:hidden" 
          onClick={onClose}
        />
        
        {/* Sidebar */}
        <div 
          ref={ref}
          className={`fixed right-0 top-0 h-full w-full max-w-md bg-background shadow-lg lg:relative lg:shadow-none ${className || ''}`}
        >
          <Card className="h-full rounded-none lg:rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart ({totalItems})
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            
            <CardContent className="flex flex-col h-full pb-0">
              {items.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Your cart is empty</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto space-y-4">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.menuItem.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(item.basePrice)} each
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          
                          <span className="w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => onRemoveItem(item.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t pt-4 mt-4 space-y-4">
                    <div className="flex justify-between items-center font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                    
                    <Button
                      onClick={onCheckout}
                      disabled={isLoading || items.length === 0}
                      className="w-full"
                      size="lg"
                    >
                      {isLoading ? "Processing..." : "Checkout"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
)
CartSidebar.displayName = "CartSidebar"
