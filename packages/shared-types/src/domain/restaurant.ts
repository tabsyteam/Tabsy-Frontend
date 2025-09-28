export interface Restaurant {
  id: string;
  name: string;
  description: string;
  logo?: string | null;
  // Flat address fields as returned by API
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  // Flat contact fields as returned by API
  phoneNumber: string;
  email: string;
  website?: string;
  // Other fields
  cuisine?: string[];
  priceRange?: 1 | 2 | 3 | 4;
  rating?: number;
  totalReviews?: number;
  active: boolean; // API uses 'active', not 'isActive'
  posEnabled?: boolean;
  openingHours?: Record<string, { open: string; close: string; closed: boolean }>;
  menus?: any[];
  tables?: any[];
  createdAt: string;
  updatedAt: string;
}

// Legacy interface for backward compatibility (can be removed later)
export interface RestaurantLegacy {
  id: string;
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
  cuisine: string[];
  priceRange: 1 | 2 | 3 | 4;
  rating: number;
  totalReviews: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RestaurantSettings {
  id: string;
  restaurantId: string;
  autoAcceptOrders: boolean;
  maxOrdersPerHour: number;
  estimatedPrepTime: number;
  taxRate: number;
  serviceChargeRate: number;
}

export interface CreateRestaurantRequest {
  name: string;
  description: string;
  // Flat address fields to match backend validator
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  // Flat contact fields to match backend validator
  phoneNumber: string;
  email: string;
  website?: string;
  // Additional fields
  cuisine?: string[];
  priceRange?: 1 | 2 | 3 | 4;
  active?: boolean;
  openingHours?: string | Record<string, { open: string; close: string; closed: boolean }>;
}

export interface UpdateRestaurantRequest {
  name?: string;
  description?: string;
  logo?: string;
  // Flat address fields to match backend validator
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  // Flat contact fields to match backend validator
  phoneNumber?: string;
  email?: string;
  website?: string;
  active?: boolean; // Backend uses 'active', not 'isActive'
  // Note: cuisine and nested contact/address objects are not supported by backend update validator
}

// Keep the nested structure for internal form state management
export interface UpdateRestaurantFormData {
  name?: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  cuisine?: string[];
  priceRange?: 1 | 2 | 3 | 4;
  isActive?: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED';
}