export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Contact {
  phone: string;
  email: string;
  website?: string;
}

export type Status = 'active' | 'inactive' | 'pending' | 'suspended';

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}