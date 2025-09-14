export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  preferences: {
    notifications: boolean;
    dietary: string[];
    language: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerProfile {
  id: string;
  customerId: string;
  avatar?: string;
  dateOfBirth?: Date;
  dietaryRestrictions: string[];
  favoriteRestaurants: string[];
  loyaltyPoints: number;
}