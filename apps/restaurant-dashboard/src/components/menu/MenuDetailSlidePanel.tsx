'use client';

import { useState, useEffect } from 'react';
import { Button } from '@tabsy/ui-components';
import {
  X,
  Edit,
  Trash2,
  Package,
  Utensils,
  Banknote,
  Clock,
  Users,
  Tag,
  CheckCircle,
  XCircle,
  Info,
  BarChart3,
  History,
  Settings,
  Image as ImageIcon,
  Star,
  TrendingUp,
} from 'lucide-react';
import type { MenuCategory, MenuItem, AllergyInfo } from '@tabsy/shared-types';
import { MenuItemStatus } from '@tabsy/shared-types';
import { useCurrentRestaurant } from '@/hooks/useCurrentRestaurant';
import { formatPrice as formatPriceUtil, type CurrencyCode } from '@tabsy/shared-utils/formatting/currency';

interface MenuDetailSlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'category' | 'item' | null;
  category?: MenuCategory | null;
  item?: MenuItem | null;
  onEdit: (data: MenuCategory | MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, type: 'category' | 'item') => void;
  onManageCustomizations?: (item: MenuItem) => void;
}

export function MenuDetailSlidePanel({
  isOpen,
  onClose,
  type,
  category,
  item,
  onEdit,
  onDelete,
  onToggleStatus,
  onManageCustomizations,
}: MenuDetailSlidePanelProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Always call hooks at the top before any conditional returns
  const { restaurant } = useCurrentRestaurant();
  const currency = (restaurant?.currency as CurrencyCode) || 'USD';

  const getAllergensList = (allergyInfo?: AllergyInfo): string[] => {
    if (!allergyInfo) return [];

    const allergens: string[] = [];

    if (allergyInfo.containsEggs) allergens.push('Eggs');
    if (allergyInfo.containsNuts) allergens.push('Nuts');
    if (allergyInfo.containsDairy) allergens.push('Dairy');
    if (allergyInfo.containsGluten) allergens.push('Gluten');
    if (allergyInfo.containsSeafood) allergens.push('Seafood');
    if (allergyInfo.other && allergyInfo.other.length > 0) {
      allergens.push(...allergyInfo.other);
    }

    return allergens;
  };
  const [activeTab, setActiveTab] = useState<'details' | 'analytics' | 'history'>('details');

  // Prevent body scroll when modal is open - must be before any returns
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !type) return null;

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await onDelete(id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (id: string, type: 'category' | 'item') => {
    setIsTogglingStatus(true);
    try {
      await onToggleStatus(id, type);
      onClose(); // Close the panel after successful status toggle
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const data = type === 'category' ? category : item;
  if (!data) return null;

  // Use shared utility for consistent formatting
  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return formatPriceUtil(numPrice, currency);
  };

  const tabs = [
    { id: 'details', label: 'Details', icon: Info },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'history', label: 'History', icon: History },
  ] as const;

  return (
    <>
      {/* Enhanced Backdrop */}
      <div
        className="fixed inset-0 modal-backdrop z-50 transition-opacity"
        onClick={onClose}
        onWheel={(e) => e.preventDefault()}
        onTouchMove={(e) => e.preventDefault()}
      />

      {/* Enhanced Slide Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-background shadow-2xl z-50 transform transition-transform overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Enhanced Header */}
          <div className="bg-background">
            {/* Header Content */}
            <div className="px-4 sm:px-8 py-2 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg shadow-md">
                    {type === 'category' ? (
                      <Package className="h-5 w-5 text-primary" />
                    ) : (
                      <Utensils className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-foreground">{data.name}</h2>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {type === 'category' ? 'Menu Category' : 'Menu Item'}
                      </span>
                      {type === 'item' &&
                        ((item as MenuItem)?.basePrice || (item as MenuItem)?.price) && (
                          <span className="price-display font-semibold">
                            {formatPrice(
                              (item as MenuItem).basePrice || (item as MenuItem).price || 0,
                            )}
                          </span>
                        )}
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-7 w-7 p-0 rounded-lg hover:bg-muted/50 -mt-1"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Status Badge */}
              <div className="mt-1">
                {(type === 'category' ? (category as any)?.active : (item as any)?.active) ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-status-success-light text-status-success-dark border border-status-success">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {type === 'category' ? 'Active' : 'Available'}
                  </span>
                ) : (
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      type === 'category'
                        ? 'bg-surface-tertiary text-content-secondary border border-default'
                        : 'bg-status-error-light text-status-error-dark border border-status-error'
                    }`}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    {type === 'category' ? 'Inactive' : 'Unavailable'}
                  </span>
                )}
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="px-4 sm:px-8">
              <div className="tab-nav">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`tab-button ${activeTab === tab.id ? 'tab-button-active' : ''}`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tabbed Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'details' && (
              <div className="px-4 sm:px-8 pb-4 sm:pb-8 space-y-6 sm:space-y-8">
                {/* Quick Actions */}
                <div className="mx-2 sm:mx-4">
                  <div className="flex items-center justify-between p-4 sm:p-6 glass-card rounded-xl">
                    <div className="flex items-center space-x-2">
                      <Settings className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Quick Actions</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(data.id, type)}
                      disabled={isTogglingStatus}
                      className="hover:scale-105 transition-all duration-200"
                    >
                      {isTogglingStatus
                        ? 'Updating...'
                        : (type === 'category' ? (category as any)?.active : (item as any)?.active)
                          ? 'Deactivate'
                          : 'Activate'}
                    </Button>
                  </div>
                </div>

                {/* Description */}
                {data.description && (
                  <div className="mx-2 sm:mx-4">
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-foreground flex items-center">
                        <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                        Description
                      </h3>
                      <div className="p-4 sm:p-6 bg-muted/30 rounded-xl border">
                        <p className="text-muted-foreground leading-relaxed">{data.description}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Category Details */}
                {type === 'category' && category && (
                  <div className="mx-2 sm:mx-4">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground flex items-center">
                        <span className="w-2 h-2 bg-secondary rounded-full mr-3"></span>
                        Category Information
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="stat-card">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-muted-foreground text-sm">Items Count</p>
                              <p className="text-2xl font-bold">0</p>
                            </div>
                            <Package className="h-8 w-8 text-primary/40" />
                          </div>
                        </div>
                        <div className="stat-card">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-muted-foreground text-sm">Display Order</p>
                              <p className="text-2xl font-bold">{category.displayOrder || 0}</p>
                            </div>
                            <Users className="h-8 w-8 text-secondary/40" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Item Details */}
                {type === 'item' && item && (
                  <div className="mx-2 sm:mx-4">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground flex items-center">
                        <span className="w-2 h-2 bg-secondary rounded-full mr-3"></span>
                        Item Information
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="stat-card">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-muted-foreground text-sm">Price</p>
                              <p className="price-display text-xl">
                                {formatPrice(item.basePrice || item.price || 0)}
                              </p>
                            </div>
                            <Banknote className="h-8 w-8 text-primary/40" />
                          </div>
                        </div>
                        {item.preparationTime && (
                          <div className="stat-card">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-muted-foreground text-sm">Prep Time</p>
                                <p className="text-2xl font-bold">{item.preparationTime}m</p>
                              </div>
                              <Clock className="h-8 w-8 text-secondary/40" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Nutritional Information */}
                      {(item as any)?.nutritionalInfo && (
                        <div className="space-y-3 mt-6">
                          <h4 className="text-md font-semibold text-foreground flex items-center">
                            <span className="w-2 h-2 bg-status-success rounded-full mr-3"></span>
                            Nutritional Information
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {(item as any).nutritionalInfo.calories > 0 && (
                              <div className="stat-card">
                                <div className="text-center">
                                  <p className="text-muted-foreground text-xs">Calories</p>
                                  <p className="text-lg font-bold text-status-success">{(item as any).nutritionalInfo.calories}</p>
                                </div>
                              </div>
                            )}
                            {(item as any).nutritionalInfo.protein > 0 && (
                              <div className="stat-card">
                                <div className="text-center">
                                  <p className="text-muted-foreground text-xs">Protein</p>
                                  <p className="text-lg font-bold text-primary">{(item as any).nutritionalInfo.protein}g</p>
                                </div>
                              </div>
                            )}
                            {(item as any).nutritionalInfo.carbohydrates > 0 && (
                              <div className="stat-card">
                                <div className="text-center">
                                  <p className="text-muted-foreground text-xs">Carbs</p>
                                  <p className="text-lg font-bold text-accent">{(item as any).nutritionalInfo.carbohydrates}g</p>
                                </div>
                              </div>
                            )}
                            {(item as any).nutritionalInfo.fat > 0 && (
                              <div className="stat-card">
                                <div className="text-center">
                                  <p className="text-muted-foreground text-xs">Fat</p>
                                  <p className="text-lg font-bold text-status-warning">{(item as any).nutritionalInfo.fat}g</p>
                                </div>
                              </div>
                            )}
                            {(item as any).nutritionalInfo.fiber > 0 && (
                              <div className="stat-card">
                                <div className="text-center">
                                  <p className="text-muted-foreground text-xs">Fiber</p>
                                  <p className="text-lg font-bold text-status-success">{(item as any).nutritionalInfo.fiber}g</p>
                                </div>
                              </div>
                            )}
                            {(item as any).nutritionalInfo.sodium > 0 && (
                              <div className="stat-card">
                                <div className="text-center">
                                  <p className="text-muted-foreground text-xs">Sodium</p>
                                  <p className="text-lg font-bold text-status-error">{(item as any).nutritionalInfo.sodium}mg</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Additional Item Details */}
                      {(item as any)?.dietaryIndicators && (item as any).dietaryIndicators.length > 0 && (
                        <div className="space-y-3 mt-6">
                          <h4 className="text-md font-semibold text-foreground flex items-center">
                            <span className="w-2 h-2 bg-status-info-light0 rounded-full mr-3"></span>
                            Dietary Information
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {(item as any).dietaryIndicators.map((dietary: string, index: number) => (
                              <span key={index} className="inline-flex items-center px-3 py-1 bg-interactive-hover text-status-info-dark text-sm rounded-full font-medium">
                                {dietary.replace('_', ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(item as any)?.allergyInfo && (
                        <div className="space-y-3 mt-6">
                          <h4 className="text-md font-semibold text-foreground flex items-center">
                            <span className="w-2 h-2 bg-accent rounded-full mr-3"></span>
                            Allergy Information
                          </h4>
                          <div className="p-4 bg-accent-light border border-accent rounded-xl">
                            <div className="text-sm text-accent">
                              {getAllergensList(item.allergyInfo).join(', ') || 'No specific allergens listed'}
                            </div>
                          </div>
                        </div>
                      )}

                      {(item as any)?.spicyLevel > 0 && (
                        <div className="space-y-3 mt-6">
                          <h4 className="text-md font-semibold text-foreground flex items-center">
                            <span className="w-2 h-2 bg-status-error rounded-full mr-3"></span>
                            Spice Level
                          </h4>
                          <div className="flex items-center gap-2">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-4 h-4 rounded-full ${
                                  i < (item as any).spicyLevel ? 'bg-status-error' : 'bg-background-tertiary'
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-sm text-muted-foreground">
                              Level {(item as any).spicyLevel} of 5
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Customizations */}
                      {type === 'item' && item && (
                        <div className="space-y-3 mt-6">
                          <div className="flex items-center justify-between">
                            <h4 className="text-md font-semibold text-foreground flex items-center">
                              <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                              Customizations ({item.options?.length || 0})
                            </h4>
                            <Button
                              onClick={() => {
                                // This will be handled by parent component
                                onManageCustomizations?.(item);
                              }}
                              size="sm"
                              variant="outline"
                              className="hover:scale-105 transition-all duration-200"
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Manage
                            </Button>
                          </div>
                          {item.options && item.options.length > 0 ? (
                            <div className="space-y-4">
                              {item.options.map((option, index) => (
                              <div key={option.id} className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <h5 className="font-medium text-foreground flex items-center gap-2">
                                      {option.name}
                                      {(option.isRequired || (option as any).required) && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-status-error-light text-status-error-dark">
                                          Required
                                        </span>
                                      )}
                                    </h5>
                                    {option.description && (
                                      <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                                    )}
                                  </div>
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                    {(option.type || (option as any).optionType)?.replace('_', ' ') || 'N/A'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                  {(option.type || (option as any).optionType) !== 'TEXT_INPUT' && (option.type || (option as any).optionType) !== 'NUMBER_INPUT' && (
                                    <>
                                      <span>Min: {option.minSelections}</span>
                                      <span>Max: {option.maxSelections}</span>
                                    </>
                                  )}
                                  <span>{option.values?.length || 0} options</span>
                                </div>

                                {/* Option Values */}
                                {option.values && option.values.length > 0 && (
                                  <div className="space-y-2">
                                    <h6 className="text-sm font-medium text-foreground">Available Options:</h6>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {option.values.map((value) => (
                                        <div key={value.id} className="flex items-center justify-between p-2 bg-background border border-border rounded-lg">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">{value.name}</span>
                                            {value.isDefault && (
                                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-status-success-light text-status-success-dark">
                                                Default
                                              </span>
                                            )}
                                          </div>
                                          {value.priceModifier !== 0 && (
                                            <span className="text-sm font-medium text-primary">
                                              {value.priceModifier > 0 ? '+' : ''}{formatPrice(value.priceModifier)}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                              <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm font-medium">No customization options yet</p>
                              <p className="text-xs">Click "Manage" above to add customization options</p>
                            </div>
                          )}
                        </div>
                      )}

                      {(item as any)?.image && (
                        <div className="space-y-3 mt-6">
                          <h4 className="text-md font-semibold text-foreground flex items-center">
                            <span className="w-2 h-2 bg-secondary rounded-full mr-3"></span>
                            Item Image
                          </h4>
                          <div className="relative w-full h-48 bg-surface-tertiary rounded-xl overflow-hidden">
                            <img
                              src={(item as any).image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/images/food/tabsy-food-placeholder.svg';
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {(item as any)?.archived && (
                        <div className="space-y-3 mt-6">
                          <h4 className="text-md font-semibold text-foreground flex items-center">
                            <span className="w-2 h-2 bg-status-warning-light0 rounded-full mr-3"></span>
                            Archive Status
                          </h4>
                          <div className="p-4 bg-status-warning-light border border-status-warning rounded-xl">
                            <div className="text-sm text-status-warning-dark">
                              This item is archived
                              {(item as any).archivedAt && (
                                <span className="block text-xs mt-1">
                                  Archived on: {new Date((item as any).archivedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="mx-2 sm:mx-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground flex items-center">
                      <span className="w-2 h-2 bg-accent rounded-full mr-3"></span>
                      Timeline
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 glass-card rounded-xl hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-success/10 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-success" />
                          </div>
                          <div>
                            <p className="font-medium">Created</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(data.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 glass-card rounded-xl hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Edit className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">Last Updated</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(data.updatedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="px-4 sm:px-8 pb-4 sm:pb-8 space-y-6 sm:space-y-8">
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl flex items-center justify-center">
                    <BarChart3 className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Analytics Coming Soon</h3>
                  <p className="text-muted-foreground">
                    Track performance metrics, popular items, and revenue data for this {type}.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="px-4 sm:px-8 pb-4 sm:pb-8 space-y-6 sm:space-y-8">
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-secondary/10 to-accent/10 rounded-2xl flex items-center justify-center">
                    <History className="h-10 w-10 text-secondary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">History Coming Soon</h3>
                  <p className="text-muted-foreground">
                    View detailed history of changes, orders, and activity for this {type}.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Action Footer */}
          <div className="border-t bg-muted/20 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>Manage your {type === 'category' ? 'category' : 'menu item'}</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  onClick={() => {
                    onEdit(data);
                    onClose(); // Close the detail panel when opening edit modal
                  }}
                  variant="outline"
                  className="hover:scale-105 transition-all duration-200 w-full sm:w-auto"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  onClick={() => handleDelete(data.id)}
                  disabled={isDeleting}
                  variant="destructive"
                  className="hover:scale-105 transition-all duration-200 min-w-[120px] w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
