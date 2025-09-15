export enum MenuItemStatus {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  ARCHIVED = 'ARCHIVED'
}

export enum DietaryType {
  VEGAN = 'VEGAN',
  VEGETARIAN = 'VEGETARIAN',
  GLUTEN_FREE = 'GLUTEN_FREE',
  DAIRY_FREE = 'DAIRY_FREE',
  NUT_FREE = 'NUT_FREE',
  KETO = 'KETO',
  HALAL = 'HALAL',
  KOSHER = 'KOSHER'
}

export enum SpiceLevel {
  NONE = 0,
  MILD = 1,
  MEDIUM = 2,
  HOT = 3,
  EXTRA_HOT = 4
}

export enum AllergenType {
  NUTS = 'NUTS',
  DAIRY = 'DAIRY',
  GLUTEN = 'GLUTEN',
  EGGS = 'EGGS',
  SOY = 'SOY',
  FISH = 'FISH',
  SHELLFISH = 'SHELLFISH',
  SESAME = 'SESAME'
}

export interface Menu {
  id: string
  restaurantId: string
  name: string
  description: string
  isActive: boolean
  validFrom?: string
  validUntil?: string
  categories: MenuCategory[]
  createdAt: string
  updatedAt: string
}

export interface MenuCategory {
  id: string
  menuId: string
  name: string
  description: string
  displayOrder: number
  isActive: boolean  // Keep this as isActive for now to maintain backward compatibility with frontend components
  imageUrl?: string  // Keep this as imageUrl for frontend compatibility
  items: MenuItem[]
  createdAt: string
  updatedAt: string
}

export interface MenuItem {
  id: string
  categoryId: string
  name: string
  description: string
  status: MenuItemStatus
  basePrice: number
  price?: number // Backend might return price instead of basePrice
  displayOrder: number
  imageUrl?: string
  dietaryTypes: DietaryType[]
  allergens: AllergenType[]
  spiceLevel?: SpiceLevel
  calories?: number
  preparationTime: number // in minutes
  nutritionalInfo?: NutritionalInfo
  options: MenuItemOption[]
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface MenuItemOption {
  id: string
  menuItemId: string
  name: string
  description: string
  type: OptionType
  isRequired: boolean
  minSelections: number
  maxSelections: number
  displayOrder: number
  values: MenuItemOptionValue[]
}

export enum OptionType {
  SINGLE_SELECT = 'SINGLE_SELECT',
  MULTI_SELECT = 'MULTI_SELECT',
  TEXT_INPUT = 'TEXT_INPUT',
  NUMBER_INPUT = 'NUMBER_INPUT'
}

export interface MenuItemOptionValue {
  id: string
  optionId: string
  name: string
  description: string
  priceModifier: number // positive for add-on cost, negative for discount
  isDefault: boolean
  displayOrder: number
}

export interface NutritionalInfo {
  calories: number
  protein: number // grams
  carbohydrates: number // grams
  fat: number // grams
  fiber: number // grams
  sugar: number // grams
  sodium: number // mg
}

export interface CreateMenuRequest {
  restaurantId: string
  name: string
  description: string
  isActive?: boolean
  validFrom?: string
  validUntil?: string
}

export interface UpdateMenuRequest {
  name?: string
  description?: string
  isActive?: boolean
  validFrom?: string
  validUntil?: string
}

export interface CreateMenuCategoryRequest {
  name: string
  description?: string
  displayOrder?: number
  active?: boolean
  image?: string
  // Note: menuId is handled automatically by backend via restaurantId route parameter
}

export interface UpdateMenuCategoryRequest {
  name?: string
  description?: string
  displayOrder?: number
  active?: boolean
  image?: string
}

export interface CreateMenuItemRequest {
  categoryId: string
  name: string
  description: string
  basePrice: number
  displayOrder: number
  status?: MenuItemStatus
  imageUrl?: string
  dietaryTypes?: DietaryType[]
  allergens?: AllergenType[]
  spiceLevel?: SpiceLevel
  calories?: number
  preparationTime: number
  nutritionalInfo?: NutritionalInfo
  tags?: string[]
}

export interface UpdateMenuItemRequest {
  name?: string
  description?: string
  basePrice?: number
  displayOrder?: number
  status?: MenuItemStatus
  imageUrl?: string
  dietaryTypes?: DietaryType[]
  allergens?: AllergenType[]
  spiceLevel?: SpiceLevel
  calories?: number
  preparationTime?: number
  nutritionalInfo?: NutritionalInfo
  tags?: string[]
}
