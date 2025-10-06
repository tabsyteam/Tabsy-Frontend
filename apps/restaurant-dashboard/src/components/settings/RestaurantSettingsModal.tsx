'use client'

import { useState, useEffect } from 'react'
import { Button } from '@tabsy/ui-components'
import { X, Save, Store, MapPin, Phone, Mail, Globe, Banknote, Clock, Settings as SettingsIcon } from 'lucide-react'
import { Restaurant, UpdateRestaurantRequest, UpdateRestaurantFormData } from '@tabsy/shared-types'
import { cn } from '@/lib/utils'
import { formatPrice, type CurrencyCode } from '@tabsy/shared-utils/formatting/currency'

interface RestaurantSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  restaurant: Restaurant | null
  onSave: (data: any) => Promise<void>
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
  const currency = (restaurant?.currency || 'USD') as CurrencyCode

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
        logo: restaurant.logo || '',
        currency: restaurant.currency || 'USD',
        posEnabled: restaurant.posEnabled || false,
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
      const updateData: any = {
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
        logo: formData.logo || '',
        currency: formData.currency || 'USD',
        posEnabled: formData.posEnabled || false,
        active: formData.isActive // Backend expects 'active', not 'isActive'
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
                    Logo URL
                  </label>
                  <input
                    type="url"
                    value={formData.logo || ''}
                    onChange={(e) => handleInputChange('logo', e.target.value)}
                    placeholder="https://yourrestaurant.com/logo.png"
                    className="w-full p-3 bg-surface-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <p className="text-xs text-content-tertiary">URL to your restaurant's logo image</p>
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
                {/* Tax Configuration (Read-Only) */}
                <div className="bg-primary-light/5 border-l-4 border-primary rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-5 h-5 text-primary" />
                      <h3 className="text-sm font-medium text-content-primary">Tax Configuration</h3>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-surface-secondary text-content-tertiary rounded">
                      View Only
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-surface-secondary rounded-lg p-3">
                      <p className="text-xs text-content-secondary mb-1">Tax Rate</p>
                      <p className="text-lg font-bold text-primary">
                        {((Number(restaurant?.taxRatePercentage || 0.10)) * 100).toFixed(2)}%
                      </p>
                      <p className="text-xs text-content-tertiary mt-1">
                        Decimal: {Number(restaurant?.taxRatePercentage || 0.10).toFixed(4)}
                      </p>
                    </div>

                    <div className="bg-surface-secondary rounded-lg p-3">
                      <p className="text-xs text-content-secondary mb-1">Fixed Amount</p>
                      <p className="text-lg font-bold text-primary">
                        {formatPrice(Number(restaurant?.taxFixedAmount || 0), currency)}
                      </p>
                      <p className="text-xs text-content-tertiary mt-1">Per order</p>
                    </div>
                  </div>

                  <div className="bg-surface-tertiary border border-border rounded-lg p-3">
                    <p className="text-xs text-content-secondary mb-2">Formula:</p>
                    <p className="text-xs font-mono text-content-primary mb-2">
                      Tax = (Subtotal × {Number(restaurant?.taxRatePercentage || 0.10).toFixed(4)}) + {formatPrice(Number(restaurant?.taxFixedAmount || 0), currency)}
                    </p>
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-content-secondary">Example on {formatPrice(100, currency)} order:</p>
                      <p className="text-xs text-content-primary font-medium">
                        {formatPrice(100 * Number(restaurant?.taxRatePercentage || 0.10) + Number(restaurant?.taxFixedAmount || 0), currency)} tax
                        → {formatPrice(100 + (100 * Number(restaurant?.taxRatePercentage || 0.10)) + Number(restaurant?.taxFixedAmount || 0), currency)} total
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-start gap-2 text-xs text-content-tertiary bg-amber-500/10 p-2 rounded">
                    <SettingsIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p>
                      Tax settings can only be modified by administrators. Contact your system admin to update tax configuration.
                    </p>
                  </div>
                </div>

                {/* Currency Configuration */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-content-secondary">
                    <Banknote className="w-4 h-4" />
                    Currency
                  </label>
                  <select
                    value={formData.currency || restaurant?.currency || 'USD'}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    className="w-full p-3 bg-surface-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="AED">AED (د.إ) - UAE Dirham</option>
                    <option value="INR">INR (₹) - Indian Rupee</option>
                  </select>
                  <p className="text-xs text-content-tertiary">
                    Select the currency for your restaurant. All prices and payments will use this currency.
                  </p>
                  {restaurant && restaurant.currency && restaurant.currency !== (formData.currency || 'USD') && (
                    <div className="mt-2 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded">
                      <SettingsIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <p>
                        Changing currency will affect all future orders. Existing orders will keep their original currency.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-content-secondary">
                    POS Integration
                  </label>
                  <div className="flex items-center gap-3 p-3 bg-surface-secondary rounded-lg border border-border">
                    <input
                      type="checkbox"
                      id="posEnabled"
                      checked={formData.posEnabled ?? false}
                      onChange={(e) => handleInputChange('posEnabled', e.target.checked)}
                      className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                    />
                    <label htmlFor="posEnabled" className="text-sm font-medium text-content-primary cursor-pointer">
                      Enable POS System Integration
                    </label>
                  </div>
                  <p className="text-xs text-content-tertiary">
                    When enabled, orders will be synchronized with your Point of Sale system
                  </p>
                </div>

                <div className="bg-surface-tertiary border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-content-secondary" />
                    <h3 className="text-sm font-medium text-content-primary">Opening Hours</h3>
                  </div>
                  <p className="text-sm text-content-secondary">
                    Opening hours configuration (JSON format) is available through the API.
                    A user-friendly interface for managing hours will be available in a future update.
                  </p>
                </div>

                <div className="bg-surface-tertiary border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <SettingsIcon className="w-4 h-4 text-content-secondary" />
                    <h3 className="text-sm font-medium text-content-primary">Additional Settings</h3>
                  </div>
                  <p className="text-sm text-content-secondary">
                    Advanced operational settings like auto-accept orders, prep times, and service charges
                    will be available in a future update.
                  </p>
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