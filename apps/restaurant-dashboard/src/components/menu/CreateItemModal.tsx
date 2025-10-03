import React, { useState, useEffect } from 'react';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@tabsy/ui-components';
import { useMutation } from '@tanstack/react-query';
import { tabsyClient } from '@tabsy/api-client';
import { toast } from 'sonner';
import {
  X,
  Utensils,
  AlertCircle,
  CheckCircle,
  Loader2,
  DollarSign,
  Package,
  Leaf,
  ShieldAlert,
  Flame,
  Clock,
  Zap,
  Tag,
  Plus,
  Minus,
  Wheat,
  Milk,
  Shield,
  Nut,
} from 'lucide-react';
import type { MenuCategory, MenuItem } from '@tabsy/shared-types';
import { MenuItemStatus, DietaryType, AllergenType, AllergyInfo, SpiceLevel } from '@tabsy/shared-types';

const getDietaryIcon = (dietaryType: DietaryType) => {
  switch (dietaryType) {
    case DietaryType.VEGETARIAN:
    case DietaryType.VEGAN:
      return <Leaf className="h-4 w-4 text-status-success" />
    case DietaryType.GLUTEN_FREE:
      return <Wheat className="h-4 w-4 text-status-warning" />
    case DietaryType.DAIRY_FREE:
      return <Milk className="h-4 w-4 text-primary" />
    case DietaryType.NUT_FREE:
      return <Nut className="h-4 w-4 text-accent" />
    case DietaryType.HALAL:
    case DietaryType.KOSHER:
      return <Shield className="h-4 w-4 text-status-success" />
    case DietaryType.KETO:
      return <Zap className="h-4 w-4 text-secondary" />
    default:
      return <Leaf className="h-4 w-4 text-status-success" />
  }
}

interface CreateItemModalProps {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
  categories: MenuCategory[];
  selectedCategory: MenuCategory | null;
  onSuccess: () => void;
  editMode?: boolean;
  initialData?: MenuItem | null;
}

interface NutritionalInfo {
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

interface ItemFormData {
  name: string;
  description: string;
  basePrice: number;
  categoryId: string;
  displayOrder: number;
  active: boolean;
  dietaryTypes: DietaryType[];
  allergens: AllergenType[];
  spicyLevel: SpiceLevel;
  calories: number;
  preparationTime: number;
  tags: string[];
  image?: string; // Changed from imageUrl to match backend
  nutritionalInfo?: NutritionalInfo;
}

interface ImageUploadState {
  file: File | null;
  preview: string | null;
  uploading: boolean;
}

interface ItemFormErrors {
  name?: string;
  description?: string;
  basePrice?: string;
  categoryId?: string;
  displayOrder?: string;
  calories?: string;
  preparationTime?: string;
  tags?: string;
}

export function CreateItemModal({
  open,
  onClose,
  restaurantId,
  categories,
  selectedCategory,
  onSuccess,
  editMode = false,
  initialData,
}: CreateItemModalProps) {
  // Utility functions to convert between backend AllergyInfo and frontend AllergenType array
  const convertAllergyInfoToAllergens = (allergyInfo: AllergyInfo): AllergenType[] => {
    if (!allergyInfo) return [];

    const allergens: AllergenType[] = [];
    if (allergyInfo.containsNuts) allergens.push(AllergenType.NUTS);
    if (allergyInfo.containsDairy) allergens.push(AllergenType.DAIRY);
    if (allergyInfo.containsGluten) allergens.push(AllergenType.GLUTEN);
    if (allergyInfo.containsEggs) allergens.push(AllergenType.EGGS);
    if (allergyInfo.containsSeafood) {
      allergens.push(AllergenType.FISH);
      allergens.push(AllergenType.SHELLFISH);
    }
    // Note: SOY and SESAME are not in the backend AllergyInfo structure

    return allergens;
  };

  const convertAllergensToAllergyInfo = (allergens: AllergenType[]): AllergyInfo => {
    const allergyInfo: AllergyInfo = {
      containsEggs: allergens.includes(AllergenType.EGGS),
      containsNuts: allergens.includes(AllergenType.NUTS),
      containsDairy: allergens.includes(AllergenType.DAIRY),
      containsGluten: allergens.includes(AllergenType.GLUTEN),
      containsSeafood: allergens.includes(AllergenType.FISH) || allergens.includes(AllergenType.SHELLFISH),
      other: []
    };

    // Handle allergens not mapped to specific boolean fields
    const otherAllergens = allergens.filter(allergen =>
      ![AllergenType.EGGS, AllergenType.NUTS, AllergenType.DAIRY, AllergenType.GLUTEN, AllergenType.FISH, AllergenType.SHELLFISH].includes(allergen)
    );

    if (otherAllergens.length > 0) {
      allergyInfo.other = otherAllergens.map(a => a.toString());
    }

    return allergyInfo;
  };

  const [formData, setFormData] = useState<ItemFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    basePrice: initialData ? (initialData.basePrice || initialData.price || 0) : 0,
    categoryId: initialData?.categoryId || selectedCategory?.id || '',
    displayOrder: initialData?.displayOrder || 0,
    active: (initialData as any)?.active ?? true,
    dietaryTypes: (initialData as any)?.dietaryIndicators || initialData?.dietaryTypes || [],
    allergens:
      initialData?.allergyInfo
        ? convertAllergyInfoToAllergens(initialData.allergyInfo)
        : [],
    spicyLevel: (initialData as any)?.spicyLevel ?? initialData?.spicyLevel ?? SpiceLevel.NONE,
    calories: initialData?.calories || (initialData as any)?.nutritionalInfo?.calories || 0,
    preparationTime: (initialData as any)?.preparationTime || 15,
    tags: (initialData as any)?.tags || [],
    image: initialData?.image || initialData?.imageUrl, // Handle both field names
    nutritionalInfo: (initialData as any)?.nutritionalInfo || {
      calories: initialData?.calories || 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
    },
  });

  const [errors, setErrors] = useState<ItemFormErrors>({});
  const [imageUpload, setImageUpload] = useState<ImageUploadState>({
    file: null,
    preview: null,
    uploading: false,
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset form when modal opens/closes or when initialData changes
  useEffect(() => {
    if (open) {
      setFormData({
        name: initialData?.name || '',
        description: initialData?.description || '',
        basePrice: initialData ? (initialData.basePrice || initialData.price || 0) : 0,
        categoryId: initialData?.categoryId || selectedCategory?.id || '',
        displayOrder: initialData?.displayOrder || 0,
        active: (initialData as any)?.active ?? true,
        dietaryTypes: (initialData as any)?.dietaryIndicators || initialData?.dietaryTypes || [],
        allergens:
          convertAllergyInfoToAllergens((initialData as any)?.allergyInfo) ||
          initialData?.allergyInfo ||
          [],
        spicyLevel: (initialData as any)?.spicyLevel ?? initialData?.spicyLevel ?? SpiceLevel.NONE,
        calories: initialData?.calories || (initialData as any)?.nutritionalInfo?.calories || 0,
        preparationTime: (initialData as any)?.preparationTime || 15,
        tags: (initialData as any)?.tags || [],
        image: initialData?.image || initialData?.imageUrl, // Handle both field names
        nutritionalInfo: (initialData as any)?.nutritionalInfo || {
          calories: initialData?.calories || 0,
          protein: 0,
          carbohydrates: 0,
          fat: 0,
          fiber: 0,
          sugar: 0,
          sodium: 0,
        },
      });
      setErrors({});
      // Reset image upload state
      setImageUpload({
        file: null,
        preview: initialData?.image || initialData?.imageUrl || null,
        uploading: false,
      });
    }
  }, [open, initialData, selectedCategory]);

  const createItemMutation = useMutation({
    mutationFn: async (data: ItemFormData) => {
      // Handle image upload if there's a file
      let imageUrl = data.image;
      if (imageUpload.file && !imageUpload.uploading) {
        try {
          imageUrl = await uploadImage(imageUpload.file);
        } catch (error) {
          console.error('Failed to upload image:', error);
          toast.error('Failed to upload image');
          throw error;
        }
      }
      // Backend now uses allergens array directly, no conversion needed

      if (editMode && initialData) {
        // Update existing item - use frontend semantic field names, backend handles transformation
        const updateData = {
          name: data.name.trim(),
          description: data.description.trim(),
          basePrice: typeof data.basePrice === 'string' ? parseFloat(data.basePrice) : Number(data.basePrice), // Frontend uses basePrice
          status: data.active ? MenuItemStatus.AVAILABLE : MenuItemStatus.UNAVAILABLE, // Frontend uses status enum
          displayOrder: data.displayOrder,
          dietaryTypes: data.dietaryTypes, // Frontend uses dietaryTypes
          allergyInfo: convertAllergensToAllergyInfo(data.allergens), // Convert to backend format
          spicyLevel: data.spicyLevel, // Frontend uses spicyLevel
          image: imageUrl,
          preparationTime: data.preparationTime || 15,
          nutritionalInfo: data.nutritionalInfo && Object.values(data.nutritionalInfo).some(v => v !== null && v !== undefined && v !== 0)
            ? data.nutritionalInfo
            : undefined,
          tags: data.tags || [],
        };
        console.log('Form data basePrice type:', typeof data.basePrice, 'value:', data.basePrice);
        console.log('Updating item with enhanced data:', updateData);
        return await tabsyClient.menu.updateItem(restaurantId, initialData.id, updateData as any);
      } else {
        // Create new item - use frontend semantic field names, backend handles transformation
        const createData = {
          name: data.name.trim(),
          description: data.description.trim(),
          basePrice: typeof data.basePrice === 'string' ? parseFloat(data.basePrice) : Number(data.basePrice), // Frontend uses basePrice
          categoryId: data.categoryId,
          displayOrder: data.displayOrder,
          status: data.active ? MenuItemStatus.AVAILABLE : MenuItemStatus.UNAVAILABLE, // Frontend uses status enum
          dietaryTypes: data.dietaryTypes, // Frontend uses dietaryTypes (backend accepts both formats)
          allergyInfo: convertAllergensToAllergyInfo(data.allergens), // Convert to backend format
          spicyLevel: data.spicyLevel, // Frontend uses spicyLevel
          image: imageUrl,
          preparationTime: data.preparationTime || 15,
          nutritionalInfo: data.nutritionalInfo && Object.values(data.nutritionalInfo).some(v => v !== null && v !== undefined && v !== 0)
            ? data.nutritionalInfo
            : undefined,
          tags: data.tags || [],
        };
        console.log('Creating item with enhanced data:', createData);
        return await tabsyClient.menu.createItem(restaurantId, createData as any);
      }
    },
    onSuccess: () => {
      setFormData({
        name: '',
        description: '',
        basePrice: 0,
        categoryId: selectedCategory?.id || '',
        displayOrder: 0,
        active: true,
        dietaryTypes: [],
        allergens: [],
        spicyLevel: SpiceLevel.NONE,
        calories: 0,
        preparationTime: 15,
        tags: [],
        image: undefined,
        nutritionalInfo: {
          calories: 0,
          protein: 0,
          carbohydrates: 0,
          fat: 0,
          fiber: 0,
          sugar: 0,
          sodium: 0,
        },
      });
      setErrors({});
      onSuccess();
    },
    onError: (error: any) => {
      console.error('Failed to create menu item:', error);
    },
  });

  const validateForm = (): boolean => {
    const newErrors: ItemFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Item name must be at least 2 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Item name must be less than 100 characters';
    }

    if (formData.description.trim().length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Please select a category';
    }

    if (formData.basePrice <= 0) {
      newErrors.basePrice = 'Price must be greater than 0';
    }

    if (formData.preparationTime < 1 || formData.preparationTime > 240) {
      newErrors.preparationTime = 'Preparation time must be between 1 and 240 minutes';
    }

    if (formData.calories < 0 || formData.calories > 5000) {
      newErrors.calories = 'Calories must be between 0 and 5000';
    }

    if (formData.tags.some((tag) => tag.length > 50)) {
      newErrors.tags = 'Individual tags must be less than 50 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      createItemMutation.mutate(formData);
    }
  };

  const handleClose = () => {
    if (!createItemMutation.isPending) {
      setFormData({
        name: '',
        description: '',
        basePrice: 0,
        categoryId: selectedCategory?.id || '',
        displayOrder: 0,
        active: true,
        dietaryTypes: [],
        allergens: [],
        spicyLevel: SpiceLevel.NONE,
        calories: 0,
        preparationTime: 15,
        tags: [],
        image: undefined,
        nutritionalInfo: {
          calories: 0,
          protein: 0,
          carbohydrates: 0,
          fat: 0,
          fiber: 0,
          sugar: 0,
          sodium: 0,
        },
      });
      setErrors({});
      onClose();
    }
  };

  const handleInputChange = (
    field: keyof ItemFormData,
    value: string | number | boolean | string[] | DietaryType[] | AllergenType[] | SpiceLevel,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Only clear error if it exists in the errors interface
    if (field in errors && errors[field as keyof ItemFormErrors]) {
      setErrors((prev) => ({ ...prev, [field as keyof ItemFormErrors]: undefined }));
    }
  };

  const handleDietaryTypeToggle = (dietaryType: DietaryType) => {
    const currentTypes = formData.dietaryTypes;
    const isSelected = currentTypes.includes(dietaryType);

    if (isSelected) {
      // Check if we're trying to remove DAIRY_FREE while VEGAN is selected
      if (dietaryType === DietaryType.DAIRY_FREE && currentTypes.includes(DietaryType.VEGAN)) {
        // Don't allow removing DAIRY_FREE when VEGAN is selected (since vegan implies dairy-free)
        return;
      }

      // Remove the selected dietary type
      let newTypes = currentTypes.filter((type) => type !== dietaryType);

      // If removing VEGAN, also remove the auto-added DAIRY_FREE (unless manually selected)
      if (dietaryType === DietaryType.VEGAN) {
        // Remove DAIRY_FREE only if it was auto-added by vegan selection
        // We can't easily track this, so we'll leave DAIRY_FREE as-is for user choice
      }

      handleInputChange('dietaryTypes', newTypes);
    } else {
      let newTypes = [...currentTypes, dietaryType];

      // Handle mutual exclusivity and implications for Vegan/Vegetarian
      // Note: Halal and Kosher are certification standards, not diet types, so they can coexist with Vegan/Vegetarian
      if (dietaryType === DietaryType.VEGAN) {
        // If selecting VEGAN, remove VEGETARIAN (since vegan is a stricter form of vegetarian)
        newTypes = newTypes.filter((type) => type !== DietaryType.VEGETARIAN);
        // VEGAN automatically implies DAIRY_FREE, so add it if not already present
        if (!newTypes.includes(DietaryType.DAIRY_FREE)) {
          newTypes.push(DietaryType.DAIRY_FREE);
        }
      } else if (dietaryType === DietaryType.VEGETARIAN) {
        // If selecting VEGETARIAN, remove VEGAN (they are mutually exclusive choices)
        newTypes = newTypes.filter((type) => type !== DietaryType.VEGAN);
      }

      handleInputChange('dietaryTypes', newTypes);
    }
  };

  const handleAllergenToggle = (allergen: AllergenType) => {
    const currentAllergens = formData.allergens;
    const isSelected = currentAllergens.includes(allergen);

    if (isSelected) {
      handleInputChange(
        'allergens',
        currentAllergens.filter((a) => a !== allergen),
      );
    } else {
      handleInputChange('allergens', [...currentAllergens, allergen]);
    }
  };

  const handleTagAdd = (newTag: string) => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      handleInputChange('tags', [...formData.tags, newTag.trim()]);
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    handleInputChange(
      'tags',
      formData.tags.filter((tag) => tag !== tagToRemove),
    );
  };

  const handleNutritionalInfoChange = (field: keyof NutritionalInfo, value: number) => {
    setFormData((prev) => ({
      ...prev,
      nutritionalInfo: {
        ...prev.nutritionalInfo,
        [field]: value,
      },
    }));
  };

  // Image upload functionality
  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUpload({
        file,
        preview: e.target?.result as string,
        uploading: false,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleImageRemove = () => {
    setImageUpload({
      file: null,
      preview: null,
      uploading: false,
    });
    handleInputChange('image', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Simulate image upload (since there's no dedicated upload endpoint)
  const uploadImage = async (file: File): Promise<string> => {
    // For now, we'll use a placeholder service or convert to base64
    // In a real app, you'd upload to a service like AWS S3, Cloudinary, etc.

    setImageUpload((prev) => ({ ...prev, uploading: true }));

    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // For demo purposes, return a placeholder URL
    // In production, you'd implement actual file upload
    const timestamp = Date.now();
    const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const mockUrl = `https://images.placeholder.com/600x400/${encodeURIComponent(fileName)}_${timestamp}.jpg`;

    setImageUpload((prev) => ({ ...prev, uploading: false }));

    return mockUrl;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="modal-content rounded-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Enhanced Header */}
        <div className="relative px-4 sm:px-8 py-4 sm:py-6 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl">
              <Utensils className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                {editMode ? 'Edit Menu Item' : 'Add Menu Item'}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Create a delicious new menu item
                {selectedCategory && (
                  <span className="inline-flex items-center ml-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                    for {selectedCategory.name}
                  </span>
                )}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={createItemMutation.isPending}
            className="absolute top-4 right-4 h-10 w-10 p-0 hover:bg-muted/50 rounded-xl"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Enhanced Form with Scroll */}
        <div className="max-h-[65vh] sm:max-h-[60vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-6 sm:space-y-8">
            {/* Image Upload Section */}
            <div className="relative">
              {(imageUpload.preview || formData.image) ? (
                <div className="glass-card p-4 border rounded-xl">
                  <div className="relative">
                    <img
                      src={imageUpload.preview || formData.image || '/images/food/tabsy-food-placeholder.svg'}
                      alt="Menu item preview"
                      className="w-full h-48 object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/food/tabsy-food-placeholder.svg';
                      }}
                    />
                    {imageUpload.uploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                          <p className="text-white text-sm">Uploading...</p>
                        </div>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleImageRemove}
                      disabled={imageUpload.uploading || createItemMutation.isPending}
                      className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleImageSelect}
                      disabled={imageUpload.uploading || createItemMutation.isPending}
                      className="flex-1"
                    >
                      Change Image
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="bg-gradient-to-br from-muted/20 to-muted/30 rounded-2xl p-4 sm:p-6 border-2 border-dashed border-border hover:border-primary/30 transition-colors cursor-pointer group"
                  onClick={handleImageSelect}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl flex items-center justify-center group-hover:from-primary/20 group-hover:to-secondary/20 transition-all duration-300">
                      <Package className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                      Add Item Image
                    </h3>
                    <p className="text-muted-foreground text-xs sm:text-sm mb-2">
                      Upload an appetizing photo to showcase your menu item
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Supports: JPG, PNG, GIF (Max 5MB)
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={createItemMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImageSelect();
                      }}
                    >
                      Choose Image
                    </Button>
                  </div>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                aria-label="Select menu item image"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Left Column - Basic Information */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center">
                    <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                    Basic Information
                  </h3>

                  {/* Item Name */}
                  <div className="form-group">
                    <label
                      htmlFor="itemName"
                      className="block text-sm font-semibold text-foreground mb-3"
                    >
                      Item Name *
                    </label>
                    <input
                      id="itemName"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="e.g., Margherita Pizza, Caesar Salad"
                      className={`form-input ${
                        errors.name
                          ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                          : ''
                      }`}
                      disabled={createItemMutation.isPending}
                    />
                    {errors.name && (
                      <div className="flex items-center mt-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{errors.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Category */}
                  <div className="form-group">
                    <label
                      htmlFor="category"
                      className="block text-sm font-semibold text-foreground mb-3"
                    >
                      Category *
                    </label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(value) => handleInputChange('categoryId', value)}
                      disabled={createItemMutation.isPending}
                    >
                      <SelectTrigger
                        className={`w-full ${
                          errors.categoryId
                            ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                            : ''
                        }`}
                      >
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.categoryId && (
                      <div className="flex items-center mt-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{errors.categoryId}</span>
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <div className="form-group">
                    <label
                      htmlFor="price"
                      className="block text-sm font-semibold text-foreground mb-3"
                    >
                      Price *
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-primary/10 rounded-lg">
                        <DollarSign className="h-4 w-4 text-primary" />
                      </div>
                      <input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.basePrice}
                        onChange={(e) =>
                          handleInputChange('basePrice', parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className={`form-input pl-16 ${
                          errors.basePrice
                            ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                            : ''
                        }`}
                        disabled={createItemMutation.isPending}
                      />
                    </div>
                    {errors.basePrice && (
                      <div className="flex items-center mt-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{errors.basePrice}</span>
                      </div>
                    )}
                  </div>

                  {/* Display Order */}
                  <div className="form-group">
                    <label
                      htmlFor="displayOrder"
                      className="block text-sm font-semibold text-foreground mb-3"
                    >
                      Display Order
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-secondary/10 rounded-lg">
                        <Package className="h-4 w-4 text-secondary" />
                      </div>
                      <input
                        id="displayOrder"
                        type="number"
                        min="0"
                        value={formData.displayOrder}
                        onChange={(e) =>
                          handleInputChange('displayOrder', parseInt(e.target.value) || 0)
                        }
                        placeholder="0"
                        className={`form-input pl-16 ${
                          errors.displayOrder
                            ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                            : ''
                        }`}
                        disabled={createItemMutation.isPending}
                      />
                    </div>
                    {errors.displayOrder ? (
                      <div className="flex items-center mt-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{errors.displayOrder}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-2 flex items-start">
                        <span className="inline-block w-1 h-1 bg-secondary rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        Order in which this item appears in the menu
                      </p>
                    )}
                  </div>

                  {/* Active Status */}
                  <div className="form-group">
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Status
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        id="active"
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => handleInputChange('active', e.target.checked)}
                        className="rounded-md border-border text-primary focus:ring-primary/20 focus:ring-2 h-5 w-5"
                        disabled={createItemMutation.isPending}
                      />
                      <label htmlFor="active" className="text-sm font-medium cursor-pointer">
                        Active (Available for ordering)
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-start">
                      <span className="inline-block w-1 h-1 bg-secondary rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      Inactive items won&apos;t be shown to customers
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column - Description and Details */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center">
                    <span className="w-2 h-2 bg-secondary rounded-full mr-3"></span>
                    Description & Details
                  </h3>

                  {/* Description */}
                  <div className="form-group">
                    <label
                      htmlFor="description"
                      className="block text-sm font-semibold text-foreground mb-3"
                    >
                      Description
                      <span className="text-muted-foreground font-normal ml-1">(Optional)</span>
                    </label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Describe what makes this dish special... ingredients, flavors, preparation style..."
                      rows={5}
                      className={`form-textarea ${
                        errors.description
                          ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                          : ''
                      }`}
                      disabled={createItemMutation.isPending}
                    />
                    <div className="flex items-center justify-between mt-2">
                      {errors.description ? (
                        <div className="flex items-center text-sm text-destructive">
                          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span>{errors.description}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground flex items-start">
                          <span className="inline-block w-1 h-1 bg-secondary rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          Help customers understand what to expect
                        </p>
                      )}
                      <span
                        className={`text-xs ${
                          formData.description.length > 450
                            ? 'text-accent'
                            : formData.description.length > 400
                              ? 'text-status-warning'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {formData.description.length}/500
                      </span>
                    </div>
                  </div>

                  {/* Dietary Information */}
                  <div className="form-group">
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Dietary Information
                      <span className="text-muted-foreground font-normal ml-1">(Optional)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.values(DietaryType).map((dietaryType) => (
                        <label
                          key={dietaryType}
                          className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/20 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={formData.dietaryTypes.includes(dietaryType)}
                            onChange={() => handleDietaryTypeToggle(dietaryType)}
                            className="rounded border-border text-primary focus:ring-primary/20 focus:ring-2 h-4 w-4"
                            disabled={createItemMutation.isPending}
                          />
                          <div className="flex items-center space-x-2">
                            {getDietaryIcon(dietaryType)}
                            <span className="text-sm font-medium capitalize">
                              {dietaryType.toLowerCase().replace('_', ' ')}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-start">
                      <span className="inline-block w-1 h-1 bg-secondary rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      Help customers find items that match their dietary preferences
                    </p>
                  </div>

                  {/* Allergy Information */}
                  <div className="form-group">
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Allergy Information
                      <span className="text-muted-foreground font-normal ml-1">
                        (Important for customer safety)
                      </span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.values(AllergenType).map((allergen) => (
                        <label
                          key={allergen}
                          className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/20 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={formData.allergens.includes(allergen)}
                            onChange={() => handleAllergenToggle(allergen)}
                            className="rounded border-border text-destructive focus:ring-destructive/20 focus:ring-2 h-4 w-4"
                            disabled={createItemMutation.isPending}
                          />
                          <div className="flex items-center space-x-2">
                            <ShieldAlert className="h-4 w-4 text-status-warning" />
                            <span className="text-sm font-medium capitalize">
                              {allergen.toLowerCase()}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-start">
                      <span className="inline-block w-1 h-1 bg-accent rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      Mark allergens present in this item to ensure customer safety
                    </p>
                  </div>

                  {/* Spice Level */}
                  <div className="form-group">
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Spice Level
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.values(SpiceLevel)
                        .filter((value) => typeof value === 'number')
                        .map((spiceValue) => {
                          const numericValue = spiceValue as number;
                          return (
                            <label
                              key={numericValue}
                              className={`flex flex-col items-center p-3 rounded-lg border cursor-pointer transition-all ${
                                formData.spicyLevel === numericValue
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border hover:bg-muted/20'
                              }`}
                            >
                              <input
                                type="radio"
                                name="spicyLevel"
                                value={numericValue}
                                checked={formData.spicyLevel === numericValue}
                                onChange={(e) =>
                                  handleInputChange(
                                    'spicyLevel',
                                    parseInt(e.target.value) as SpiceLevel,
                                  )
                                }
                                className="sr-only"
                                disabled={createItemMutation.isPending}
                              />
                              <div className="flex items-center space-x-1 mb-1">
                                {Array.from({ length: Math.max(1, numericValue) }, (_, i) => (
                                  <Flame
                                    key={i}
                                    className={`h-3 w-3 ${
                                      numericValue === 0
                                        ? 'text-content-disabled'
                                        : numericValue === 1
                                          ? 'text-status-warning'
                                          : numericValue === 2
                                            ? 'text-accent'
                                            : numericValue === 3
                                              ? 'text-status-error'
                                              : 'text-status-error'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs font-medium">
                                {numericValue === 0
                                  ? 'None'
                                  : numericValue === 1
                                    ? 'Mild'
                                    : numericValue === 2
                                      ? 'Medium'
                                      : numericValue === 3
                                        ? 'Hot'
                                        : 'Extra Hot'}
                              </span>
                            </label>
                          );
                        })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-start">
                      <span className="inline-block w-1 h-1 bg-accent rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      Let customers know the heat level of your dish
                    </p>
                  </div>

                  {/* Preparation Time */}
                  <div className="form-group">
                    <label
                      htmlFor="preparationTime"
                      className="block text-sm font-semibold text-foreground mb-3"
                    >
                      Prep Time (minutes)
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-interactive-hover rounded-lg">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <input
                        id="preparationTime"
                        type="number"
                        min="1"
                        max="240"
                        value={formData.preparationTime}
                        onChange={(e) =>
                          handleInputChange('preparationTime', parseInt(e.target.value) || 15)
                        }
                        placeholder="15"
                        className={`form-input pl-16 ${
                          errors.preparationTime
                            ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                            : ''
                        }`}
                        disabled={createItemMutation.isPending}
                      />
                    </div>
                    {errors.preparationTime ? (
                      <div className="flex items-center mt-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{errors.preparationTime}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-2 flex items-start">
                        <span className="inline-block w-1 h-1 bg-status-info-light0 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        Kitchen planning estimate
                      </p>
                    )}
                  </div>

                  {/* Nutritional Information */}
                  <div className="form-group">
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Nutritional Information
                      <span className="text-muted-foreground font-normal ml-1">(Optional)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Calories */}
                      <div>
                        <label htmlFor="nutrition-calories" className="block text-xs font-medium text-muted-foreground mb-2">
                          Calories
                        </label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 p-1 bg-status-success-light rounded">
                            <Zap className="h-3 w-3 text-status-success" />
                          </div>
                          <input
                            id="nutrition-calories"
                            type="number"
                            min="0"
                            max="5000"
                            value={formData.nutritionalInfo?.calories || ''}
                            onChange={(e) =>
                              handleNutritionalInfoChange(
                                'calories',
                                e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                            className="form-input pl-10 text-sm h-10"
                            disabled={createItemMutation.isPending}
                          />
                        </div>
                      </div>

                      {/* Protein */}
                      <div>
                        <label htmlFor="nutrition-protein" className="block text-xs font-medium text-muted-foreground mb-2">
                          Protein (g)
                        </label>
                        <input
                          id="nutrition-protein"
                          type="number"
                          min="0"
                          max="200"
                          value={formData.nutritionalInfo?.protein || ''}
                          onChange={(e) =>
                            handleNutritionalInfoChange(
                              'protein',
                              e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                            )
                          }
                          placeholder="0"
                          className="form-input text-sm h-10"
                          disabled={createItemMutation.isPending}
                        />
                      </div>

                      {/* Carbohydrates */}
                      <div>
                        <label htmlFor="nutrition-carbs" className="block text-xs font-medium text-muted-foreground mb-2">
                          Carbs (g)
                        </label>
                        <input
                          id="nutrition-carbs"
                          type="number"
                          min="0"
                          max="500"
                          value={formData.nutritionalInfo?.carbohydrates || ''}
                          onChange={(e) =>
                            handleNutritionalInfoChange(
                              'carbohydrates',
                              e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                            )
                          }
                          placeholder="0"
                          className="form-input text-sm h-10"
                          disabled={createItemMutation.isPending}
                        />
                      </div>

                      {/* Fat */}
                      <div>
                        <label htmlFor="nutrition-fat" className="block text-xs font-medium text-muted-foreground mb-2">
                          Fat (g)
                        </label>
                        <input
                          id="nutrition-fat"
                          type="number"
                          min="0"
                          max="200"
                          value={formData.nutritionalInfo?.fat || ''}
                          onChange={(e) =>
                            handleNutritionalInfoChange(
                              'fat',
                              e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                            )
                          }
                          placeholder="0"
                          className="form-input text-sm h-10"
                          disabled={createItemMutation.isPending}
                        />
                      </div>

                      {/* Fiber */}
                      <div>
                        <label htmlFor="nutrition-fiber" className="block text-xs font-medium text-muted-foreground mb-2">
                          Fiber (g)
                        </label>
                        <input
                          id="nutrition-fiber"
                          type="number"
                          min="0"
                          max="100"
                          value={formData.nutritionalInfo?.fiber || ''}
                          onChange={(e) =>
                            handleNutritionalInfoChange(
                              'fiber',
                              e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                            )
                          }
                          placeholder="0"
                          className="form-input text-sm h-10"
                          disabled={createItemMutation.isPending}
                        />
                      </div>

                      {/* Sugar */}
                      <div>
                        <label htmlFor="nutrition-sugar" className="block text-xs font-medium text-muted-foreground mb-2">
                          Sugar (g)
                        </label>
                        <input
                          id="nutrition-sugar"
                          type="number"
                          min="0"
                          max="200"
                          value={formData.nutritionalInfo?.sugar || ''}
                          onChange={(e) =>
                            handleNutritionalInfoChange(
                              'sugar',
                              e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                            )
                          }
                          placeholder="0"
                          className="form-input text-sm h-10"
                          disabled={createItemMutation.isPending}
                        />
                      </div>

                      {/* Sodium */}
                      <div className="col-span-2">
                        <label htmlFor="nutrition-sodium" className="block text-xs font-medium text-muted-foreground mb-2">
                          Sodium (mg)
                        </label>
                        <input
                          id="nutrition-sodium"
                          type="number"
                          min="0"
                          max="10000"
                          value={formData.nutritionalInfo?.sodium || ''}
                          onChange={(e) =>
                            handleNutritionalInfoChange(
                              'sodium',
                              e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                            )
                          }
                          placeholder="0"
                          className="form-input text-sm h-10"
                          disabled={createItemMutation.isPending}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-start">
                      <span className="inline-block w-1 h-1 bg-status-success rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      Provide detailed nutritional information to help customers make informed choices
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="form-group">
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      Tags
                      <span className="text-muted-foreground font-normal ml-1">(Optional)</span>
                    </label>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleTagRemove(tag)}
                              className="ml-2 hover:text-destructive transition-colors"
                              disabled={createItemMutation.isPending}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="Add a tag (e.g., chef's special, popular)"
                          className="form-input flex-1"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const target = e.target as HTMLInputElement;
                              handleTagAdd(target.value);
                              target.value = '';
                            }
                          }}
                          disabled={createItemMutation.isPending}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e: React.MouseEvent) => {
                            const input = (e.target as HTMLElement).parentElement?.querySelector(
                              'input',
                            ) as HTMLInputElement;
                            if (input?.value) {
                              handleTagAdd(input.value);
                              input.value = '';
                            }
                          }}
                          disabled={createItemMutation.isPending}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-start">
                      <span className="inline-block w-1 h-1 bg-secondary rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      Add keywords to help with search and categorization
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Mode Notice */}
            {editMode && (
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-status-success rounded-xl mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-status-success-light rounded-lg">
                    <CheckCircle className="h-5 w-5 text-status-success" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-status-success-dark">Editing Menu Item</h4>
                    <p className="text-sm text-status-success-dark mt-1">
                      You can update all fields including dietary info, allergens, spice level.
                      However, you can not change prep time, calories, and tags for now.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!editMode && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-status-info rounded-xl mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-interactive-hover rounded-lg">
                    <AlertCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-status-info-dark">Note about Pricing</h4>
                    <p className="text-sm text-status-info mt-1">
                      Enter the price in dollars (e.g., 12.99). The price will be saved and
                      displayed correctly.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Error Display */}
            {createItemMutation.error && (
              <div className="p-4 bg-gradient-to-r from-destructive/10 to-red-50 border border-destructive/20 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-destructive/10 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-destructive">
                      Failed to {editMode ? 'update' : 'create'} menu item
                    </h4>
                    <p className="text-sm text-destructive/80 mt-1">
                      {createItemMutation.error.message || 'Please check your input and try again.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Success Display */}
            {createItemMutation.isSuccess && (
              <div className="p-4 bg-gradient-to-r from-success/10 to-green-50 border border-success/20 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-success/10 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-success">
                      Menu item created successfully!
                    </h4>
                    <p className="text-sm text-success/80 mt-1">
                      Your delicious new menu item is now available.
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
            <div className="text-xs text-muted-foreground">* Required fields must be completed</div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={createItemMutation.isPending}
                className="hover:scale-105 transition-all duration-200 w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  createItemMutation.isPending ||
                  !formData.name.trim() ||
                  !formData.categoryId ||
                  formData.basePrice <= 0 ||
                  formData.preparationTime < 1
                }
                className="btn-primary hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl min-w-[140px] w-full sm:w-auto order-1 sm:order-2"
              >
                {createItemMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Utensils className="h-4 w-4 mr-2" />
                    {editMode ? 'Update Item' : 'Create Item'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
