import * as React from 'react'
import { MenuItem, MenuItemStatus } from '@tabsy/shared-types'
import { formatCurrency } from '@tabsy/shared-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Button } from './button'

interface MenuItemCardProps {
  item: MenuItem
  onAddToCart?: (item: MenuItem) => void
  isLoading?: boolean
  showAddButton?: boolean
  className?: string
}

export const MenuItemCard = React.forwardRef<HTMLDivElement, MenuItemCardProps>(
  ({ item, onAddToCart, isLoading = false, showAddButton = true, className }, ref) => {
    const handleAddToCart = () => {
      if (onAddToCart) {
        onAddToCart(item)
      }
    }

    return (
      <Card ref={ref} className={className}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg">{item.name}</CardTitle>
              <CardDescription className="mt-1">
                {item.description}
              </CardDescription>
              <div className="mt-2 font-semibold text-lg">
                {formatCurrency(item.basePrice)}
              </div>
            </div>
            {item.imageUrl && (
              <div className="ml-4 flex-shrink-0">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
              </div>
            )}
          </div>
        </CardHeader>
        {showAddButton && (
          <CardContent className="pt-0">
            <Button
              onClick={handleAddToCart}
              disabled={item.status !== MenuItemStatus.AVAILABLE || isLoading}
              className="w-full"
              variant={item.status !== MenuItemStatus.AVAILABLE ? "outline" : "default"}
            >
              {item.status !== MenuItemStatus.AVAILABLE ? "Not Available" : isLoading ? "Adding..." : "Add to Cart"}
            </Button>
          </CardContent>
        )}
      </Card>
    )
  }
)
MenuItemCard.displayName = "MenuItemCard"
