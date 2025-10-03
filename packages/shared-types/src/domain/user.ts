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
  // Backend currently only has 'active: boolean'
  // TODO: Backend should be updated to use status enum instead
  active?: boolean
  createdAt: string
  updatedAt: string
  // Restaurant relationship ID (for RESTAURANT_OWNER/STAFF)
  restaurantId?: string
}

// Helper function to compute status from active field
export function getUserStatus(user: User): UserStatus {
  // Since backend only has active boolean, map it to status
  return user.active !== false ? UserStatus.ACTIVE : UserStatus.INACTIVE
}

export interface CreateUserRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  role: UserRole
  restaurantId?: string  // Required for RESTAURANT_OWNER, RESTAURANT_STAFF
}

export interface UpdateUserRequest {
  email?: string
  firstName?: string
  lastName?: string
  phone?: string
  role?: UserRole
  active?: boolean  // Backend field for enabling/disabling users
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
