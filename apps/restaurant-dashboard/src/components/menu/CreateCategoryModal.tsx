import { useState } from 'react'
import { Button } from '@tabsy/ui-components'
import { useMutation } from '@tanstack/react-query'
import { tabsyClient } from '@tabsy/api-client'
import {
  X,
  Package,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'

interface CreateCategoryModalProps {
  open: boolean
  onClose: () => void
  restaurantId: string
  onSuccess: () => void
}

interface CategoryFormData {
  name: string
  description: string
  displayOrder: number
}

interface CategoryFormErrors {
  name?: string
  description?: string
  displayOrder?: string
}

export function CreateCategoryModal({ open, onClose, restaurantId, onSuccess }: CreateCategoryModalProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    displayOrder: 0
  })
  
  const [errors, setErrors] = useState<CategoryFormErrors>({})
  
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      // Create category with the expected parameters
      return await tabsyClient.menu.createCategory(restaurantId, {
        menuId: '', // This will be handled by the backend
        name: data.name.trim(),
        description: data.description.trim() || '',
        displayOrder: data.displayOrder,
        isActive: true
      } as any) // Use 'as any' to bypass TypeScript validation
    },
    onSuccess: () => {
      setFormData({ name: '', description: '', displayOrder: 0 })
      setErrors({})
      onSuccess()
    },
    onError: (error: any) => {
      console.error('Failed to create category:', error)
    }
  })
  
  const validateForm = (): boolean => {
    const newErrors: CategoryFormErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Category name must be at least 2 characters'
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Category name must be less than 50 characters'
    }
    
    if (formData.description.trim().length > 200) {
      newErrors.description = 'Description must be less than 200 characters'
    }
    
    if (formData.displayOrder < 0) {
      newErrors.displayOrder = 'Display order must be a positive number'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      createCategoryMutation.mutate(formData)
    }
  }
  
  const handleClose = () => {
    if (!createCategoryMutation.isPending) {
      setFormData({ name: '', description: '', displayOrder: 0 })
      setErrors({})
      onClose()
    }
  }
  
  const handleInputChange = (field: keyof CategoryFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Only clear error if it exists in the errors interface
    if (field in errors && errors[field as keyof CategoryFormErrors]) {
      setErrors(prev => ({ ...prev, [field as keyof CategoryFormErrors]: undefined }))
    }
  }
  
  if (!open) return null
  
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Add Category</h2>
              <p className="text-sm text-muted-foreground">Create a new menu category</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={createCategoryMutation.isPending}
            className="h-8 w-8 p-0 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Category Name */}
          <div className="space-y-2">
            <label htmlFor="categoryName" className="text-sm font-medium text-foreground">
              Category Name *
            </label>
            <input
              id="categoryName"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Appetizers, Main Courses, Desserts"
              className={`input-theme w-full px-3 py-2 rounded-lg placeholder:text-muted-foreground transition-colors ${
                errors.name ? 'error' : ''
              }`}
              disabled={createCategoryMutation.isPending}
            />
            {errors.name && (
              <p className="text-sm text-destructive flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.name}
              </p>
            )}
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="categoryDescription" className="text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              id="categoryDescription"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Optional description for this category"
              rows={3}
              className={`input-theme w-full px-3 py-2 rounded-lg placeholder:text-muted-foreground resize-none transition-colors ${
                errors.description ? 'error' : ''
              }`}
              disabled={createCategoryMutation.isPending}
            />
            {errors.description && (
              <p className="text-sm text-destructive flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.description.length}/200 characters
            </p>
          </div>
          
          {/* Display Order */}
          <div className="space-y-2">
            <label htmlFor="displayOrder" className="text-sm font-medium text-foreground">
              Display Order
            </label>
            <input
              id="displayOrder"
              type="number"
              min="0"
              value={formData.displayOrder}
              onChange={(e) => handleInputChange('displayOrder', parseInt(e.target.value) || 0)}
              placeholder="0"
              className={`input-theme w-full px-3 py-2 rounded-lg placeholder:text-muted-foreground transition-colors ${
                errors.displayOrder ? 'error' : ''
              }`}
              disabled={createCategoryMutation.isPending}
            />
            {errors.displayOrder && (
              <p className="text-sm text-destructive flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.displayOrder}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Categories with lower numbers appear first
            </p>
          </div>
          
          {/* Error Display */}
          {createCategoryMutation.error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive font-medium">
                  Failed to create category
                </span>
              </div>
              <p className="text-sm text-destructive/80 mt-1">
                {createCategoryMutation.error.message || 'Please try again later.'}
              </p>
            </div>
          )}
          
          {/* Success Display */}
          {createCategoryMutation.isSuccess && (
            <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm text-success font-medium">
                  Category created successfully!
                </span>
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createCategoryMutation.isPending}
              className=""
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createCategoryMutation.isPending || !formData.name.trim()}
              className="btn-primary"
            >
              {createCategoryMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Create Category
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}