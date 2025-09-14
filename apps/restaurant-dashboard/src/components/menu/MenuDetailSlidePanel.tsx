'use client'

import { useState } from 'react'
import { Button } from '@tabsy/ui-components'
import {
  X,
  Edit,
  Trash2,
  Package,
  Utensils,
  DollarSign,
  Clock,
  Users,
  Tag,
  CheckCircle,
  XCircle
} from 'lucide-react'
import type { MenuCategory, MenuItem } from '@tabsy/shared-types'
import { MenuItemStatus } from '@tabsy/shared-types'

interface MenuDetailSlidePanelProps {
  isOpen: boolean
  onClose: () => void
  type: 'category' | 'item' | null
  category?: MenuCategory | null
  item?: MenuItem | null
  onEdit: (data: MenuCategory | MenuItem) => void
  onDelete: (id: string) => void
  onToggleStatus: (id: string, type: 'category' | 'item') => void
}

export function MenuDetailSlidePanel({
  isOpen,
  onClose,
  type,
  category,
  item,
  onEdit,
  onDelete,
  onToggleStatus
}: MenuDetailSlidePanelProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  if (!isOpen || !type) return null

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    try {
      await onDelete(id)
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }

  const data = type === 'category' ? category : item
  if (!data) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Slide Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-background shadow-xl z-50 transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-card">
            <div className="flex items-center space-x-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                {type === 'category' ? (
                  <Package className="h-5 w-5 text-primary" />
                ) : (
                  <Utensils className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {data.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {type === 'category' ? 'Menu Category' : 'Menu Item'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Status</span>
                <div className="flex items-center space-x-2">
                  {(type === 'category' ? (category as MenuCategory)?.isActive : (item as MenuItem)?.status === MenuItemStatus.AVAILABLE) ? (
                    <div className="flex items-center space-x-1 text-success">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">{type === 'category' ? 'Active' : 'Available'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-destructive">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm">{type === 'category' ? 'Inactive' : 'Unavailable'}</span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onToggleStatus(data.id, type)}
                  >
                    {(type === 'category' ? (category as MenuCategory)?.isActive : (item as MenuItem)?.status === MenuItemStatus.AVAILABLE) ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>

              {/* Description */}
              {data.description && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {data.description}
                  </p>
                </div>
              )}

              {/* Category-specific details */}
              {type === 'category' && category && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">Category Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">Items Count</span>
                      <span className="text-sm font-medium">0</span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">Display Order</span>
                      <span className="text-sm font-medium">{category.displayOrder || 0}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Item-specific details */}
              {type === 'item' && item && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">Item Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                      <span className="text-sm text-muted-foreground flex items-center space-x-1">
                        <DollarSign className="h-3 w-3" />
                        <span>Price</span>
                      </span>
                      <span className="text-sm font-medium">${item.basePrice}</span>
                    </div>
                    {item.preparationTime && (
                      <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                        <span className="text-sm text-muted-foreground flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Prep Time</span>
                        </span>
                        <span className="text-sm font-medium">{item.preparationTime} min</span>
                      </div>
                    )}
                    {item.categoryId && (
                      <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                        <span className="text-sm text-muted-foreground flex items-center space-x-1">
                          <Tag className="h-3 w-3" />
                          <span>Category</span>
                        </span>
                        <span className="text-sm font-medium">{item.categoryId}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Created</span>
                    <span className="text-sm font-medium">
                      {new Date(data.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Updated</span>
                    <span className="text-sm font-medium">
                      {new Date(data.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t p-6 bg-card">
            <div className="flex space-x-3">
              <Button
                onClick={() => onEdit(data)}
                className="flex-1"
                variant="default"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit {type === 'category' ? 'Category' : 'Item'}
              </Button>
              <Button
                onClick={() => handleDelete(data.id)}
                disabled={isDeleting}
                variant="destructive"
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? 'Deleting...' : `Delete ${type === 'category' ? 'Category' : 'Item'}`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}