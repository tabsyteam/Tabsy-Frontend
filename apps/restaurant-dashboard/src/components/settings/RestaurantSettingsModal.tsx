'use client'

import { useState, useEffect } from 'react'
import { Button } from '@tabsy/ui-components'
import { X, Save, Store, MapPin, Phone, Mail, Globe, DollarSign, Clock, Settings as SettingsIcon } from 'lucide-react'
import { Restaurant, UpdateRestaurantRequest, UpdateRestaurantFormData } from '@tabsy/shared-types'
import { cn } from '@/lib/utils'

interface RestaurantSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  restaurant: Restaurant | null
  onSave: (data: UpdateRestaurantRequest) => Promise<void>
  isLoading?: boolean
}

export function RestaurantSettingsModal({
  isOpen,
  onClose,
  restaurant,
  onSave,
  isLoading = false
}: RestaurantSettingsModalProps) {
  const [formData, setFormData] = useState<UpdateRestaurantFormData>({})
  const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'operational'>('general')

  useEffect(() => {
    if (restaurant && isOpen) {
      // Handle the actual API response structure which has flat fields
      const initialFormData = {
        name: restaurant.name,
        description: restaurant.description,
        // Convert flat address fields to nested object for form handling
        address: {
          street: restaurant.address || '',
          city: restaurant.city || '',
          state: restaurant.state || '',
          zipCode: restaurant.zipCode || '',
          country: restaurant.country || ''
        },
        // Create contact object from flat fields
        contact: {
          phone: restaurant.phoneNumber || '',
          email: restaurant.email || '',
          website: restaurant.website || ''
        },
        cuisine: restaurant.cuisine || [],
        priceRange: restaurant.priceRange || 1,
        isActive: restaurant.active ?? true // API uses 'active', not 'isActive'
      }
      setFormData(initialFormData)
    }
  }, [restaurant, isOpen])

  if (!isOpen || !restaurant) return null

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNestedInputChange = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev as any)[parent],
        [field]: value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Transform the form data to match backend validator expectations
      const updateData: UpdateRestaurantRequest = {
        name: formData.name,
        description: formData.description,
        // Convert nested address object to flat fields for backend
        address: formData.address?.street || '',
        city: formData.address?.city || '',
        state: formData.address?.state || '',
        zipCode: formData.address?.zipCode || '',
        country: formData.address?.country || '',
        // Convert nested contact to flat fields for backend
        phoneNumber: formData.contact?.phone || '',
        email: formData.contact?.email || '',
        website: formData.contact?.website || '',
        active: formData.isActive // Backend expects 'active', not 'isActive'
        // Note: cuisine field is not allowed in backend updates
      }

      await onSave(updateData)
      onClose()
    } catch (error) {
      console.error('Failed to update restaurant settings:', error)
    }
  }

  const tabs = [
    { id: 'general', label: 'General', icon: <Store className="w-4 h-4" /> },
    { id: 'contact', label: 'Contact', icon: <Phone className="w-4 h-4" /> },
    { id: 'operational', label: 'Operational', icon: <SettingsIcon className="w-4 h-4" /> }
  ]

  const priceRangeLabels = {
    1: '$ - Budget-friendly',
    2: '$$ - Moderate',
    3: '$$$ - Upscale',
    4: '$$$$ - Fine dining'
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Close modal when clicking on backdrop (not on the modal content)
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-surface rounded-lg shadow-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-content-primary">Restaurant Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-secondary transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-content-secondary" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-content-secondary hover:text-content-primary"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-96">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-content-secondary">
                    <Store className="w-4 h-4" />
                    Restaurant Name
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full p-3 bg-surface-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-content-secondary">
                    Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="w-full p-3 bg-surface-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-content-secondary">
                    Cuisine Types
                  </label>
                  <input
                    type="text"
                    value={formData.cuisine?.join(', ') || ''}
                    onChange={(e) => handleInputChange('cuisine', e.target.value.split(',').map(c => c.trim()).filter(Boolean))}
                    placeholder="Italian, American, Vegetarian"
                    className="w-full p-3 bg-surface-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <p className="text-xs text-content-tertiary">Separate multiple cuisines with commas</p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-content-secondary">
                    <DollarSign className="w-4 h-4" />
                    Price Range
                  </label>
                  <select
                    value={formData.priceRange || 1}
                    onChange={(e) => handleInputChange('priceRange', parseInt(e.target.value))}
                    className="w-full p-3 bg-surface-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {Object.entries(priceRangeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive ?? true}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-content-secondary">
                    Restaurant is active and accepting orders
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-content-secondary">
                    <MapPin className="w-4 h-4" />
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.address?.street || ''}
                    onChange={(e) => handleNestedInputChange('address', 'street', e.target.value)}
                    className="w-full p-3 bg-surface-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-content-secondary">City</label>
                    <input
                      type="text"
                      value={formData.address?.city || ''}
                      onChange={(e) => handleNestedInputChange('address', 'city', e.target.value)}
                      className="w-full p-3 bg-surface-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-content-secondary">State</label>
                    <input
                      type="text"
                      value={formData.address?.state || ''}
                      onChange={(e) => handleNestedInputChange('address', 'state', e.target.value)}
                      className="w-full p-3 bg-surface-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-content-secondary">ZIP Code</label>
                    <input
                      type="text"
                      value={formData.address?.zipCode || ''}
                      onChange={(e) => handleNestedInputChange('address', 'zipCode', e.target.value)}
                      className="w-full p-3 bg-surface-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-content-secondary">Country</label>
                    <input
                      type="text"
                      value={formData.address?.country || ''}
                      onChange={(e) => handleNestedInputChange('address', 'country', e.target.value)}
                      className="w-full p-3 bg-surface-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-content-secondary">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.contact?.phone || ''}
                    onChange={(e) => handleNestedInputChange('contact', 'phone', e.target.value)}
                    className="w-full p-3 bg-surface-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-content-secondary">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.contact?.email || ''}
                    onChange={(e) => handleNestedInputChange('contact', 'email', e.target.value)}
                    className="w-full p-3 bg-surface-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-content-secondary">
                    <Globe className="w-4 h-4" />
                    Website (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.contact?.website || ''}
                    onChange={(e) => handleNestedInputChange('contact', 'website', e.target.value)}
                    placeholder="https://yourrestaurant.com"
                    className="w-full p-3 bg-surface-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {activeTab === 'operational' && (
              <div className="space-y-6">
                <div className="bg-surface-tertiary border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-content-secondary" />
                    <h3 className="text-sm font-medium text-content-primary">Operational Settings</h3>
                  </div>
                  <p className="text-sm text-content-secondary">
                    Advanced operational settings like auto-accept orders, prep times, and service charges
                    will be available in a future update. These settings are currently managed at the system level.
                  </p>
                </div>

                <div className="text-center py-8">
                  <SettingsIcon className="w-12 h-12 text-content-tertiary mx-auto mb-4" />
                  <p className="text-content-secondary">More operational settings coming soon!</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}