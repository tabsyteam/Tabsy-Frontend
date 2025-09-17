import { NotificationPreferences } from './notification'

export enum UserRole {
  ADMIN = 'ADMIN',
  RESTAURANT_OWNER = 'RESTAURANT_OWNER',
  RESTAURANT_STAFF = 'RESTAURANT_STAFF',
  CUSTOMER = 'CUSTOMER'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED'
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  role: UserRole
  status: UserStatus
  profileImageUrl?: string
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
  // Restaurant relationships - included when user is restaurant owner/staff
  restaurantOwner?: {
    id: string
    restaurantId: string
    createdAt: string
    updatedAt: string
  }
  restaurantStaff?: {
    id: string
    restaurantId: string
    position: string
    createdAt: string
    updatedAt: string
  }
}

export interface CreateUserRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  role: UserRole
}

export interface UpdateUserRequest {
  firstName?: string
  lastName?: string
  phone?: string
  profileImageUrl?: string
}

export interface UserProfile extends User {
  preferences: UserPreferences
}

export interface UserPreferences {
  language: string
  timezone: string
  notifications: NotificationPreferences
  accessibility: AccessibilityPreferences
}

export interface AccessibilityPreferences {
  highContrast: boolean
  largeText: boolean
  screenReader: boolean
}
