export interface RestaurantOwner {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  restaurantIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RestaurantStaff {
  id: string;
  restaurantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'manager' | 'waiter' | 'chef' | 'cashier';
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}