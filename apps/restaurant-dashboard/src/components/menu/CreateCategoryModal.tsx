import { useState, useEffect } from 'react'
import { Button } from '@tabsy/ui-components'
import { useMutation } from '@tanstack/react-query'
import { tabsyClient } from '@tabsy/api-client'
import { MenuCategory } from '@tabsy/shared-types'
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
  editMode?: boolean
  initialData?: MenuCategory | null
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

export function CreateCategoryModal({ open, onClose, restaurantId, onSuccess, editMode = false, initialData }: CreateCategoryModalProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    displayOrder: initialData?.displayOrder || 0
  })
  
  const [errors, setErrors] = useState<CategoryFormErrors>({})

  // Reset form when modal opens/closes or when initialData changes
  useEffect(() => {
    if (open) {
      setFormData({
        name: initialData?.name || '',
        description: initialData?.description || '',
        displayOrder: initialData?.displayOrder || 0
      })
      setErrors({})
    }
  }, [open, initialData])
  
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      if (editMode && initialData) {
        // Update existing category
        const requestBody = {
          name: data.name.trim(),
          displayOrder: data.displayOrder,
          active: (initialData as any).active,
          ...(data.description.trim() ? { description: data.description.trim() } : {})
        }
        return await tabsyClient.menu.updateCategory(restaurantId, initialData.id, requestBody)
      } else {
        // Create new category
        const requestBody = {
          name: data.name.trim(),
          displayOrder: data.displayOrder,
          active: true,
          ...(data.description.trim() ? { description: data.description.trim() } : {})
        }
        return await tabsyClient.menu.createCategory(restaurantId, requestBody)
      }
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
    <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="modal-content rounded-2xl w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Enhanced Header */}
        <div className="relative px-4 sm:px-8 py-4 sm:py-6 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">{editMode ? 'Edit Category' : 'Add Category'}</h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">{editMode ? 'Update your menu category details' : 'Create a new menu category for your restaurant'}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={createCategoryMutation.isPending}
            className="absolute top-4 right-4 h-10 w-10 p-0 hover:bg-muted/50 rounded-xl"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Enhanced Form with Scroll */}
        <div className="max-h-[65vh] sm:max-h-[60vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-6 sm:space-y-8">
          {/* Category Name */}
          <div className="form-group">
            <label htmlFor="categoryName" className="block text-sm font-semibold text-foreground mb-3">
              Category Name *
            </label>
            <input
              id="categoryName"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Appetizers, Main Courses, Desserts"
              className={`form-input ${
                errors.name ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''
              }`}
              disabled={createCategoryMutation.isPending}
            />
            {errors.name && (
              <div className="flex items-center mt-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>{errors.name}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="categoryDescription" className="block text-sm font-semibold text-foreground mb-3">
              Description
              <span className="text-muted-foreground font-normal ml-1">(Optional)</span>
            </label>
            <textarea
              id="categoryDescription"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe this category to help customers understand what to expect..."
              rows={4}
              className={`form-textarea ${
                errors.description ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''
              }`}
              disabled={createCategoryMutation.isPending}
            />
            <div className="flex items-center justify-between mt-2">
              {errors.description ? (
                <div className="flex items-center text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>{errors.description}</span>
                </div>
              ) : (
                <div></div>
              )}
              <span className={`text-xs ${
                formData.description.length > 180 ? 'text-orange-500' :
                formData.description.length > 160 ? 'text-amber-500' : 'text-muted-foreground'
              }`}>
                {formData.description.length}/200
              </span>
            </div>
          </div>

          {/* Display Order */}
          <div className="form-group">
            <label htmlFor="displayOrder" className="block text-sm font-semibold text-foreground mb-3">
              Display Order
            </label>
            <input
              id="displayOrder"
              type="number"
              min="0"
              max="999"
              value={formData.displayOrder}
              onChange={(e) => handleInputChange('displayOrder', parseInt(e.target.value) || 0)}
              placeholder="0"
              className={`form-input ${
                errors.displayOrder ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''
              }`}
              disabled={createCategoryMutation.isPending}
            />
            {errors.displayOrder ? (
              <div className="flex items-center mt-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>{errors.displayOrder}</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-2 flex items-start">
                <span className="inline-block w-1 h-1 bg-primary rounded-full mt-2 mr-2 flex-shrink-0"></span>
                Categories with lower numbers appear first in your menu
              </p>
            )}
          </div>
          
          {/* Enhanced Error Display */}
          {createCategoryMutation.error && (
            <div className="p-4 bg-gradient-to-r from-destructive/10 to-red-50 border border-destructive/20 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-destructive">
                    Failed to {editMode ? 'update' : 'create'} category
                  </h4>
                  <p className="text-sm text-destructive/80 mt-1">
                    {createCategoryMutation.error.message || 'Please check your input and try again.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Success Display */}
          {createCategoryMutation.isSuccess && (
            <div className="p-4 bg-gradient-to-r from-success/10 to-green-50 border border-success/20 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-success">
                    Category {editMode ? 'updated' : 'created'} successfully!
                  </h4>
                  <p className="text-sm text-success/80 mt-1">
                    Your {editMode ? 'changes have been saved' : 'new category is ready to use'}.
                  </p>
                </div>
              </div>
            </div>
          )}
          </form>
        </div>

        {/* Enhanced Actions Footer */}
        <div className="px-4 sm:px-8 py-4 sm:py-6 bg-muted/20 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              * Required fields must be completed
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={createCategoryMutation.isPending}
                className="hover:scale-105 transition-all duration-200 w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createCategoryMutation.isPending || !formData.name.trim()}
                className="btn-primary hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl min-w-[140px] w-full sm:w-auto order-1 sm:order-2"
              >
                {createCategoryMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    {editMode ? 'Update Category' : 'Create Category'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}