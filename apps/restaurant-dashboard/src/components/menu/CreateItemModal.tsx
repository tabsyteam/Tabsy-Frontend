import { useState } from 'react'
import { Button } from '@tabsy/ui-components'
import { useMutation } from '@tanstack/react-query'
import { tabsyClient } from '@tabsy/api-client'
import {
  X,
  Utensils,
  AlertCircle,
  CheckCircle,
  Loader2,
  DollarSign,
  Package
} from 'lucide-react'
import type { MenuCategory } from '@tabsy/shared-types'
import { DietaryType, MenuItemStatus } from '@tabsy/shared-types'

interface CreateItemModalProps {
  open: boolean
  onClose: () => void
  restaurantId: string
  categories: MenuCategory[]
  selectedCategory: MenuCategory | null
  onSuccess: () => void
}

interface ItemFormData {
  name: string
  description: string
  basePrice: number
  categoryId: string
  preparationTime: number
  dietaryTypes: DietaryType[]
}

interface ItemFormErrors {
  name?: string
  description?: string
  basePrice?: string
  categoryId?: string
  preparationTime?: string
}

export function CreateItemModal({ 
  open, 
  onClose, 
  restaurantId, 
  categories, 
  selectedCategory, 
  onSuccess 
}: CreateItemModalProps) {
  const [formData, setFormData] = useState<ItemFormData>({
    name: '',
    description: '',
    basePrice: 0,
    categoryId: selectedCategory?.id || '',
    preparationTime: 0,
    dietaryTypes: []
  })
  
  const [errors, setErrors] = useState<ItemFormErrors>({})
  
  const createItemMutation = useMutation({
    mutationFn: async (data: ItemFormData) => {
      return await tabsyClient.menu.createItem(restaurantId, {
        name: data.name.trim(),
        description: data.description.trim(),
        basePrice: Math.round(data.basePrice * 100), // Convert to cents
        categoryId: data.categoryId,
        preparationTime: data.preparationTime,
        displayOrder: 0,
        status: MenuItemStatus.AVAILABLE,
        dietaryTypes: data.dietaryTypes,
        allergens: [],
        tags: []
      })
    },
    onSuccess: () => {
      setFormData({
        name: '',
        description: '',
        basePrice: 0,
        categoryId: selectedCategory?.id || '',
        preparationTime: 0,
        dietaryTypes: []
      })
      setErrors({})
      onSuccess()
    },
    onError: (error: any) => {
      console.error('Failed to create menu item:', error)
    }
  })
  
  const validateForm = (): boolean => {
    const newErrors: ItemFormErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Item name must be at least 2 characters'
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Item name must be less than 100 characters'
    }
    
    if (formData.description.trim().length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }
    
    if (!formData.categoryId) {
      newErrors.categoryId = 'Please select a category'
    }
    
    if (formData.basePrice <= 0) {
      newErrors.basePrice = 'Price must be greater than 0'
    }
    
    if (formData.preparationTime < 0) {
      newErrors.preparationTime = 'Preparation time cannot be negative'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      createItemMutation.mutate(formData)
    }
  }
  
  const handleClose = () => {
    if (!createItemMutation.isPending) {
      setFormData({
        name: '',
        description: '',
        basePrice: 0,
        categoryId: selectedCategory?.id || '',
        preparationTime: 0,
        dietaryTypes: []
      })
      setErrors({})
      onClose()
    }
  }
  
  const handleInputChange = (field: keyof ItemFormData, value: string | number | boolean | DietaryType[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Only clear error if it exists in the errors interface
    if (field in errors && errors[field as keyof ItemFormErrors]) {
      setErrors(prev => ({ ...prev, [field as keyof ItemFormErrors]: undefined }))
    }
  }
  
  if (!open) return null
  
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Utensils className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Add Menu Item</h2>
              <p className="text-sm text-muted-foreground">
                Create a new menu item
                {selectedCategory && ` for ${selectedCategory.name}`}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={createItemMutation.isPending}
            className="h-8 w-8 p-0 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Item Name */}
              <div className="space-y-2">
                <label htmlFor="itemName" className="text-sm font-medium text-foreground">
                  Item Name *
                </label>
                <input
                  id="itemName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Margherita Pizza, Caesar Salad"
                  className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors ${
                    errors.name 
                      ? 'border-destructive focus:border-destructive focus:ring-destructive/20' 
                      : 'border-border focus:border-primary focus:ring-primary/20'
                  }`}
                  disabled={createItemMutation.isPending}
                />
                {errors.name && (
                  <p className="text-sm text-destructive flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.name}
                  </p>
                )}
              </div>
              
              {/* Category */}
              <div className="space-y-2">
                <label htmlFor="category" className="text-sm font-medium text-foreground">
                  Category *
                </label>
                <select
                  id="category"
                  value={formData.categoryId}
                  onChange={(e) => handleInputChange('categoryId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 transition-colors ${
                    errors.categoryId 
                      ? 'border-destructive focus:border-destructive focus:ring-destructive/20' 
                      : 'border-border focus:border-primary focus:ring-primary/20'
                  }`}
                  disabled={createItemMutation.isPending}
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="text-sm text-destructive flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.categoryId}
                  </p>
                )}
              </div>
              
              {/* Price */}
              <div className="space-y-2">
                <label htmlFor="price" className="text-sm font-medium text-foreground">
                  Price *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.basePrice}
                    onChange={(e) => handleInputChange('basePrice', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors ${
                      errors.basePrice 
                        ? 'border-destructive focus:border-destructive focus:ring-destructive/20' 
                        : 'border-border focus:border-primary focus:ring-primary/20'
                    }`}
                    disabled={createItemMutation.isPending}
                  />
                </div>
                {errors.basePrice && (
                  <p className="text-sm text-destructive flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.basePrice}
                  </p>
                )}
              </div>
              
              {/* Preparation Time */}
              <div className="space-y-2">
                <label htmlFor="prepTime" className="text-sm font-medium text-foreground">
                  Preparation Time (minutes)
                </label>
                <input
                  id="prepTime"
                  type="number"
                  min="0"
                  value={formData.preparationTime}
                  onChange={(e) => handleInputChange('preparationTime', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors ${
                    errors.preparationTime 
                      ? 'border-destructive focus:border-destructive focus:ring-destructive/20' 
                      : 'border-border focus:border-primary focus:ring-primary/20'
                  }`}
                  disabled={createItemMutation.isPending}
                />
                {errors.preparationTime && (
                  <p className="text-sm text-destructive flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.preparationTime}
                  </p>
                )}
              </div>
            </div>
            
            {/* Right Column */}
            <div className="space-y-6">
              {/* Description */}
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the menu item..."
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 resize-none transition-colors ${
                    errors.description 
                      ? 'border-destructive focus:border-destructive focus:ring-destructive/20' 
                      : 'border-border focus:border-primary focus:ring-primary/20'
                  }`}
                  disabled={createItemMutation.isPending}
                />
                {errors.description && (
                  <p className="text-sm text-destructive flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formData.description.length}/500 characters
                </p>
              </div>
              
              {/* Dietary Information */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Dietary Information
                </label>
                <div className="space-y-3">
                  {Object.values(DietaryType).slice(0, 3).map((dietaryType) => (
                    <label key={dietaryType} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.dietaryTypes.includes(dietaryType)}
                        onChange={(e) => {
                          const newDietaryTypes = e.target.checked
                            ? [...formData.dietaryTypes, dietaryType]
                            : formData.dietaryTypes.filter(type => type !== dietaryType)
                          handleInputChange('dietaryTypes', newDietaryTypes)
                        }}
                        className="rounded border-border text-primary focus:ring-primary focus:ring-2"
                        disabled={createItemMutation.isPending}
                      />
                      <span className="text-sm text-foreground">
                        {dietaryType.replace('_', ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Error Display */}
          {createItemMutation.error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive font-medium">
                  Failed to create menu item
                </span>
              </div>
              <p className="text-sm text-destructive/80 mt-1">
                {createItemMutation.error.message || 'Please try again later.'}
              </p>
            </div>
          )}
          
          {/* Success Display */}
          {createItemMutation.isSuccess && (
            <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm text-success font-medium">
                  Menu item created successfully!
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
              disabled={createItemMutation.isPending}
              className=""
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createItemMutation.isPending || !formData.name.trim() || !formData.categoryId || formData.basePrice <= 0}
              className="btn-primary"
            >
              {createItemMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Utensils className="h-4 w-4 mr-2" />
                  Create Item
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}