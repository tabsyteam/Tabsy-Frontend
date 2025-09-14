'use client'

import { Button } from '@tabsy/ui-components'
import {
  Package,
  Utensils,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  Clock
} from 'lucide-react'
import type { MenuCategory, MenuItem } from '@tabsy/shared-types'
import { MenuItemStatus } from '@tabsy/shared-types'

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
  const { type, data, onEdit, onDelete, onSelect } = props

  if (type === 'category') {
    const category = data as MenuCategory
    return (
      <div className="bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow">
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-foreground truncate">
                    {category.name}
                  </h3>
                  {category.isActive ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </div>
                {category.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {category.description}
                  </p>
                )}
                <div className="flex items-center text-xs text-muted-foreground mt-2">
                  <span>Category items</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelect(category)}
                className="h-8 w-8 p-0"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(category)}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(category.id)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Menu Item Card
  const item = data as MenuItem
  return (
    <div className="bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Utensils className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-foreground truncate">
                  {item.name}
                </h3>
                {item.status === MenuItemStatus.AVAILABLE ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                    Available
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                    {item.status === MenuItemStatus.OUT_OF_STOCK ? 'Out of Stock' :
                     item.status === MenuItemStatus.ARCHIVED ? 'Archived' : 'Unavailable'}
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {item.description}
                </p>
              )}
              <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
                <span className="flex items-center space-x-1">
                  <DollarSign className="h-3 w-3" />
                  <span>{item.basePrice}</span>
                </span>
                {item.preparationTime && (
                  <span className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{item.preparationTime}min</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelect(item)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(item)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(item.id)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}