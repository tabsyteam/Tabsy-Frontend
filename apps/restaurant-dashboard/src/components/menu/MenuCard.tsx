'use client'

import { Button } from '@tabsy/ui-components'
import {
  Package,
  Utensils,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Banknote,
  Clock,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react'
import { MenuItemImage } from '../ui/OptimizedImage'
import type { MenuCategory, MenuItem } from '@tabsy/shared-types'
import { MenuItemStatus } from '@tabsy/shared-types'
import { useCurrentRestaurant } from '@/hooks/useCurrentRestaurant'
import { formatPrice as formatPriceUtil, type CurrencyCode } from '@tabsy/shared-utils/formatting/currency'

interface MenuCategoryCardProps {
  type: 'category'
  data: MenuCategory
  onEdit: (category: MenuCategory) => void
  onDelete: (categoryId: string) => void
  onSelect: (category: MenuCategory) => void
}

interface MenuItemCardProps {
  type: 'item'
  data: MenuItem
  onEdit: (item: MenuItem) => void
  onDelete: (itemId: string) => void
  onSelect: (item: MenuItem) => void
}

type MenuCardProps = MenuCategoryCardProps | MenuItemCardProps

export function MenuCard(props: MenuCardProps) {
  const { type, data, onEdit, onDelete, onSelect} = props

  // Always call hooks before any conditional returns
  const { restaurant } = useCurrentRestaurant()
  const currency = (restaurant?.currency as CurrencyCode) || 'USD'

  if (type === 'category') {
    const category = data as MenuCategory
    return (
      <div className="glass-card menu-card-hover group cursor-pointer relative overflow-hidden h-full" onClick={() => onSelect(category)}>
        <div className="p-4 h-full flex flex-col">
          {/* Header with icon and status */}
          <div className="flex items-start justify-between mb-3 relative">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 group-hover:from-primary/20 group-hover:to-secondary/20 transition-all duration-300">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                {/* Status indicator dot */}
                <div className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-card ${
                  category.active ? 'bg-status-success' : 'bg-content-disabled'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-base mb-2 truncate group-hover:text-primary transition-colors leading-tight">
                  {category.name}
                </h3>
                {category.active ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-status-success-light text-status-success-dark border border-status-success">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-surface-tertiary text-content-secondary border border-border-secondary">
                    <XCircle className="h-3 w-3 mr-1" />
                    Inactive
                  </span>
                )}
              </div>
            </div>

            {/* Quick actions - positioned absolutely to stay within bounds */}
            <div className="absolute top-0 right-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-lg border border-border/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation()
                  onSelect(category)
                }}
                className="h-7 w-7 p-0 hover:bg-interactive-hover hover:text-primary hover:shadow-md transition-all"
                title="View details"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation()
                  onEdit(category)
                }}
                className="h-7 w-7 p-0 hover:bg-interactive-hover hover:text-primary hover:shadow-md transition-all"
                title="Edit category"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation()
                  onDelete(category.id)
                }}
                className="h-7 w-7 p-0 hover:bg-status-error-light hover:text-status-error hover:shadow-md transition-all"
                title="Delete category"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Description */}
          <div className="flex-1 mb-3">
            {category.description ? (
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {category.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No description provided
              </p>
            )}
          </div>

          {/* Footer stats */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-auto">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Package className="h-3 w-3 flex-shrink-0" />
                <span>Category</span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <span>#{category.displayOrder || 0}</span>
              </div>
            </div>
            <div className="text-xs font-medium text-primary">
              <span>Manage →</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Menu Item Card
  const item = data as MenuItem

  // Use shared utility for consistent formatting
  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    return formatPriceUtil(numPrice, currency)
  }

  return (
    <div className="glass-card menu-card-hover group cursor-pointer relative overflow-hidden h-full" onClick={() => onSelect(item)}>
      <div className="p-4 h-full flex flex-col">
        {/* Header with image placeholder and status */}
        <div className="flex items-start space-x-3 mb-3 relative">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted/20 group-hover:shadow-md transition-all duration-300">
              <MenuItemImage
                src={item.image || item.imageUrl}
                alt={item.name}
                className="w-full h-full group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            {/* Status indicator */}
            <div className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-card ${
              item.active ? 'bg-status-success' : 'bg-status-error'
            }`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <h3 className="font-semibold text-foreground text-base truncate group-hover:text-primary transition-colors leading-tight">
                {item.name}
              </h3>
            </div>
            {item.active ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-status-success-light text-status-success-dark border border-status-success">
                <CheckCircle className="h-3 w-3 mr-1" />
                Available
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-status-error-light text-status-error-dark border border-status-error">
                <XCircle className="h-3 w-3 mr-1" />
                Unavailable
              </span>
            )}
          </div>

          {/* Quick actions - positioned absolutely to stay within bounds */}
          <div className="absolute top-0 right-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-lg border border-border/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation()
                onSelect(item)
              }}
              className="h-7 w-7 p-0 hover:bg-interactive-hover hover:text-primary hover:shadow-md transition-all"
              title="View details"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation()
                onEdit(item)
              }}
              className="h-7 w-7 p-0 hover:bg-interactive-hover hover:text-primary hover:shadow-md transition-all"
              title="Edit item"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation()
                onDelete(item.id)
              }}
              className="h-7 w-7 p-0 hover:bg-status-error-light hover:text-status-error hover:shadow-md transition-all"
              title="Delete item"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Description */}
        <div className="flex-1 mb-3">
          {item.description ? (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No description provided
            </p>
          )}
        </div>

        {/* Footer with price and metadata */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-auto">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <span className="font-semibold text-sm text-primary">
                {formatPrice(item.basePrice || item.price || 0)}
              </span>
            </div>
            {item.preparationTime && item.preparationTime > 0 && (
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span>{item.preparationTime}m</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-xs text-accent">
              <Star className="h-3 w-3 flex-shrink-0" />
              <span>Popular</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}