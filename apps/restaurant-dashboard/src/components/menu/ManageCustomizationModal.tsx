'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@tabsy/ui-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tabsyClient } from '@tabsy/api-client';
import { toast } from 'sonner';
import {
  X,
  Plus,
  Trash2,
  Edit,
  AlertCircle,
  Loader2,
  Settings,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Move,
  Hash,
  Type,
  List,
  CheckSquare,
} from 'lucide-react';
import {
  OptionType,
} from '@tabsy/shared-types';
import type {
  MenuItemOption,
  MenuItemOptionValue,
  CreateMenuItemOptionRequest,
  UpdateMenuItemOptionRequest,
  OptionValueCreateRequest,
  OptionValueUpdateRequest,
} from '@tabsy/shared-types';

interface ManageCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  menuItemId: string;
  menuItemName: string;
  existingOptions: MenuItemOption[];
  onSuccess: () => void;
}

interface OptionFormData {
  name: string;
  description: string;
  optionType: OptionType;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  displayOrder: number;
  values: OptionValueFormData[];
}

interface OptionValueFormData {
  id?: string; // For existing values
  name: string;
  description: string;
  priceModifier: number;
  isDefault: boolean;
  displayOrder: number;
}

interface FormErrors {
  name?: string;
  minSelections?: string;
  maxSelections?: string;
  values?: { [index: number]: { name?: string; priceModifier?: string } };
}

// Helper function to format option type for display
const formatOptionType = (option: MenuItemOption): string => {
  const type = option.type || (option as any).optionType;
  if (!type) return 'Unknown Type';
  return String(type).replace(/_/g, ' ').toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function ManageCustomizationModal({
  isOpen,
  onClose,
  restaurantId,
  menuItemId,
  menuItemName,
  existingOptions,
  onSuccess,
}: ManageCustomizationModalProps) {
  const [editingOption, setEditingOption] = useState<MenuItemOption | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<OptionFormData>({
    name: '',
    description: '',
    optionType: OptionType.SINGLE_SELECT,
    required: false,
    minSelections: 0,
    maxSelections: 1,
    displayOrder: existingOptions.length,
    values: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const queryClient = useQueryClient();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editingOption) {
        setFormData({
          name: editingOption.name,
          description: editingOption.description || '',
          optionType: editingOption.type || (editingOption as any).optionType || OptionType.SINGLE_SELECT,
          required: editingOption.isRequired || (editingOption as any).required || false,
          minSelections: editingOption.minSelections || 0,
          maxSelections: editingOption.maxSelections || 1,
          displayOrder: editingOption.displayOrder || 0,
          values: editingOption.values?.map(value => ({
            id: value.id,
            name: value.name,
            description: value.description || '',
            priceModifier: value.priceModifier || 0,
            isDefault: value.isDefault || false,
            displayOrder: value.displayOrder || 0,
          })) || [],
        });
      } else {
        setFormData({
          name: '',
          description: '',
          optionType: OptionType.SINGLE_SELECT,
          required: false,
          minSelections: 0,
          maxSelections: 1,
          displayOrder: existingOptions.length,
          values: [],
        });
      }
      setErrors({});
    }
  }, [isOpen, editingOption, existingOptions.length]);

  // Create option mutation
  const createOptionMutation = useMutation({
    mutationFn: async (data: CreateMenuItemOptionRequest) => {
      return await tabsyClient.menu.createOption(restaurantId, menuItemId, data);
    },
    onSuccess: () => {
      toast.success('Customization option created successfully');
      // Invalidate both menu-items and menu-categories queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['menu-items', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['menu-categories', restaurantId] });
      onSuccess();
      // Don't close the modal immediately - let user see the new option
      setIsCreating(false);
      setEditingOption(null);
      // Reset form for creating another option
      setFormData({
        name: '',
        description: '',
        optionType: OptionType.SINGLE_SELECT,
        required: false,
        minSelections: 0,
        maxSelections: 1,
        displayOrder: existingOptions.length + 1,
        values: [],
      });
      setErrors({});
    },
    onError: (error: any) => {
      console.error('Failed to create option:', error);
      toast.error('Failed to create customization option');
    },
  });

  // Update option mutation
  const updateOptionMutation = useMutation({
    mutationFn: async (data: { optionId: string; updateData: UpdateMenuItemOptionRequest }) => {
      return await tabsyClient.menu.updateOption(restaurantId, menuItemId, data.optionId, data.updateData);
    },
    onSuccess: () => {
      toast.success('Customization option updated successfully');
      // Invalidate both menu-items and menu-categories queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['menu-items', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['menu-categories', restaurantId] });
      onSuccess();
      // Don't close the modal immediately - let user see the updated option
      setEditingOption(null);
      setIsCreating(false);
    },
    onError: (error: any) => {
      console.error('Failed to update option:', error);
      toast.error('Failed to update customization option');
    },
  });

  // Delete option mutation
  const deleteOptionMutation = useMutation({
    mutationFn: async (optionId: string) => {
      return await tabsyClient.menu.deleteOption(restaurantId, menuItemId, optionId);
    },
    onSuccess: () => {
      toast.success('Customization option deleted successfully');
      // Invalidate both menu-items and menu-categories queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['menu-items', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['menu-categories', restaurantId] });
      onSuccess();
    },
    onError: (error: any) => {
      console.error('Failed to delete option:', error);
      toast.error('Failed to delete customization option');
    },
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Option name is required';
    }

    if (formData.optionType === OptionType.MULTI_SELECT) {
      if (formData.minSelections < 0) {
        newErrors.minSelections = 'Minimum selections cannot be negative';
      }
      if (formData.maxSelections < formData.minSelections) {
        newErrors.maxSelections = 'Maximum selections must be greater than minimum';
      }
    }

    // Validate values for select types
    if (formData.optionType === OptionType.SINGLE_SELECT || formData.optionType === OptionType.MULTI_SELECT) {
      if (formData.values.length === 0) {
        if (!newErrors.values) newErrors.values = {};
        // We'll show this as a general error
      }

      const valueErrors: { [index: number]: { name?: string; priceModifier?: string } } = {};
      formData.values.forEach((value, index) => {
        if (!value.name.trim()) {
          if (!valueErrors[index]) valueErrors[index] = {};
          valueErrors[index].name = 'Value name is required';
        }
        if (isNaN(value.priceModifier)) {
          if (!valueErrors[index]) valueErrors[index] = {};
          valueErrors[index].priceModifier = 'Price modifier must be a number';
        }
      });

      if (Object.keys(valueErrors).length > 0) {
        newErrors.values = valueErrors;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingOption) {
      // For updates, separate option metadata from values
      const updateData: UpdateMenuItemOptionRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        optionType: formData.optionType,
        required: formData.required,
        minSelections: formData.minSelections,
        maxSelections: formData.maxSelections,
        displayOrder: formData.displayOrder,
        // Note: values are handled separately - not included in option metadata update
      };

      updateOptionMutation.mutate({
        optionId: editingOption.id,
        updateData: updateData,
      });
    } else {
      // For creates, include values in the request
      const optionData: CreateMenuItemOptionRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        optionType: formData.optionType,
        required: formData.required,
        minSelections: formData.minSelections,
        maxSelections: formData.maxSelections,
        displayOrder: formData.displayOrder,
        values: formData.values.map((value, index) => ({
          name: value.name.trim(),
          description: value.description.trim() || undefined,
          priceModifier: value.priceModifier,
          isDefault: value.isDefault,
          displayOrder: index,
        })),
      };

      createOptionMutation.mutate(optionData);
    }
  };

  const handleClose = () => {
    setEditingOption(null);
    setIsCreating(false);
    setFormData({
      name: '',
      description: '',
      optionType: OptionType.SINGLE_SELECT,
      required: false,
      minSelections: 0,
      maxSelections: 1,
      displayOrder: existingOptions.length,
      values: [],
    });
    setErrors({});
    onClose();
  };

  const handleDeleteOption = async (optionId: string) => {
    if (confirm('Are you sure you want to delete this customization option?')) {
      deleteOptionMutation.mutate(optionId);
    }
  };

  const addValue = () => {
    setFormData(prev => ({
      ...prev,
      values: [
        ...prev.values,
        {
          name: '',
          description: '',
          priceModifier: 0,
          isDefault: false,
          displayOrder: prev.values.length,
        },
      ],
    }));
  };

  const removeValue = (index: number) => {
    setFormData(prev => ({
      ...prev,
      values: prev.values.filter((_, i) => i !== index),
    }));
  };

  const updateValue = (index: number, field: keyof OptionValueFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      values: prev.values.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
    }));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  };

  const getOptionTypeIcon = (type: OptionType) => {
    switch (type) {
      case OptionType.SINGLE_SELECT:
        return <CheckSquare className="h-4 w-4" />;
      case OptionType.MULTI_SELECT:
        return <List className="h-4 w-4" />;
      case OptionType.TEXT_INPUT:
        return <Type className="h-4 w-4" />;
      case OptionType.NUMBER_INPUT:
        return <Hash className="h-4 w-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Manage Customizations</h2>
                  <p className="text-sm text-muted-foreground">{menuItemName}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex h-[calc(90vh-200px)]">
            {/* Left Panel - Existing Options */}
            <div className="w-1/3 border-r bg-muted/20 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Existing Options ({existingOptions.length})</h3>
                <Button
                  onClick={() => {
                    setIsCreating(true);
                    setEditingOption(null);
                  }}
                  size="sm"
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add New
                </Button>
              </div>

              <div className="space-y-2 max-h-[calc(100%-60px)] overflow-y-auto">
                {existingOptions.map((option) => (
                  <div
                    key={option.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      editingOption?.id === option.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-background hover:bg-muted/50'
                    }`}
                    onClick={() => {
                      setEditingOption(option);
                      setIsCreating(false);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getOptionTypeIcon(option.type)}
                          <h4 className="font-medium text-sm truncate">{option.name}</h4>
                          {(option.isRequired || (option as any).required) && (
                            <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatOptionType(option)} • {option.values?.length || 0} options
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOption(option.id);
                        }}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                {existingOptions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No customization options yet</p>
                    <p className="text-xs">Click "Add New" to create one</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Form */}
            <div className="flex-1 p-6">
              {(isCreating || editingOption) ? (
                <form onSubmit={handleSubmit} className="h-full flex flex-col">
                  <div className="flex-1 space-y-6 overflow-y-auto">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">
                        {editingOption ? 'Edit Option' : 'Create New Option'}
                      </h3>

                      {/* Basic Info */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Option Name *</label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="e.g., Size, Toppings, Cooking Level"
                          />
                          {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Description</label>
                          <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Optional description"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Option Type</label>
                          <select
                            value={formData.optionType}
                            onChange={(e) => setFormData(prev => ({ ...prev, optionType: e.target.value as OptionType }))}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          >
                            <option value={OptionType.SINGLE_SELECT}>Single Select (choose one)</option>
                            <option value={OptionType.MULTI_SELECT}>Multi Select (choose multiple)</option>
                            <option value={OptionType.TEXT_INPUT}>Text Input</option>
                            <option value={OptionType.NUMBER_INPUT}>Number Input</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={formData.required}
                              onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
                              className="rounded"
                            />
                            <span className="text-sm font-medium">Required</span>
                          </label>
                        </div>

                        {formData.optionType === OptionType.MULTI_SELECT && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">Min Selections</label>
                              <input
                                type="number"
                                value={formData.minSelections}
                                onChange={(e) => setFormData(prev => ({ ...prev, minSelections: parseInt(e.target.value) || 0 }))}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                min="0"
                              />
                              {errors.minSelections && <p className="text-sm text-destructive mt-1">{errors.minSelections}</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Max Selections</label>
                              <input
                                type="number"
                                value={formData.maxSelections}
                                onChange={(e) => setFormData(prev => ({ ...prev, maxSelections: parseInt(e.target.value) || 1 }))}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                min="1"
                              />
                              {errors.maxSelections && <p className="text-sm text-destructive mt-1">{errors.maxSelections}</p>}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Option Values */}
                      {(formData.optionType === OptionType.SINGLE_SELECT || formData.optionType === OptionType.MULTI_SELECT) && (
                        <div className="mt-6">
                          <div className="flex items-center justify-between mb-4">
                            <label className="text-sm font-medium">Option Values *</label>
                            <Button type="button" onClick={addValue} size="sm" variant="outline">
                              <Plus className="h-4 w-4 mr-1" />
                              Add Value
                            </Button>
                          </div>

                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {formData.values.map((value, index) => (
                              <div key={index} className="p-3 border border-border rounded-lg bg-muted/20">
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                  <div>
                                    <input
                                      type="text"
                                      value={value.name}
                                      onChange={(e) => updateValue(index, 'name', e.target.value)}
                                      className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                                      placeholder="Value name"
                                    />
                                    {errors.values?.[index]?.name && (
                                      <p className="text-xs text-destructive mt-1">{errors.values[index].name}</p>
                                    )}
                                  </div>
                                  <div>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={value.priceModifier}
                                      onChange={(e) => updateValue(index, 'priceModifier', parseFloat(e.target.value) || 0)}
                                      className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                                      placeholder="Price modifier"
                                    />
                                    {errors.values?.[index]?.priceModifier && (
                                      <p className="text-xs text-destructive mt-1">{errors.values[index].priceModifier}</p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={value.isDefault}
                                      onChange={(e) => updateValue(index, 'isDefault', e.target.checked)}
                                      className="rounded"
                                    />
                                    <span className="text-xs">Default option</span>
                                  </label>
                                  <Button
                                    type="button"
                                    onClick={() => removeValue(index)}
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {formData.values.length === 0 && (
                            <div className="text-center py-4 text-muted-foreground border border-dashed border-border rounded-lg">
                              <p className="text-sm">No values added yet</p>
                              <p className="text-xs">Click "Add Value" to create options</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => {
                      setEditingOption(null);
                      setIsCreating(false);
                    }}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createOptionMutation.isPending || updateOptionMutation.isPending}
                    >
                      {(createOptionMutation.isPending || updateOptionMutation.isPending) && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {editingOption ? 'Update Option' : 'Create Option'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="h-full flex items-center justify-center text-center">
                  <div>
                    <Settings className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">Select an option to edit</h3>
                    <p className="text-muted-foreground mb-4">
                      Choose an existing customization option from the left panel or create a new one.
                    </p>
                    <Button onClick={() => {
                      setIsCreating(true);
                      setEditingOption(null);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Option
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}