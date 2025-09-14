export interface Restaurant {
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
}

export interface UpdateRestaurantRequest {
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