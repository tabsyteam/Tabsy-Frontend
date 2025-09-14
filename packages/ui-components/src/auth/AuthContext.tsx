'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, UserRole } from '@tabsy/shared-types'
import { TabsyAPI } from '@tabsy/api-client'

export interface AuthSession {
  user: User
  token: string
  refreshToken: string
  expiresAt: number
}

export interface AuthContextValue {
  session: AuthSession | null
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  refreshAuth: () => Promise<void>
  hasRole: (role: UserRole | UserRole[]) => boolean
  checkPermission: (permission: string) => boolean
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  role: UserRole
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
  apiClient: TabsyAPI
}

export function AuthProvider({ children, apiClient }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load session from storage on mount
  useEffect(() => {
    loadStoredSession()
  }, [])

  // Auto-refresh token before expiry
  useEffect(() => {
    if (session && session.expiresAt) {
      const timeUntilExpiry = session.expiresAt - Date.now()
      const refreshBuffer = 5 * 60 * 1000 // 5 minutes before expiry
      
      if (timeUntilExpiry > refreshBuffer) {
        const timeoutId = setTimeout(() => {
          refreshAuth()
        }, timeUntilExpiry - refreshBuffer)
        
        return () => clearTimeout(timeoutId)
      } else if (timeUntilExpiry > 0) {
        // Token expires soon, refresh immediately
        refreshAuth()
      }
    }
  }, [session])

  const loadStoredSession = useCallback(async () => {
    try {
      const storedSession = localStorage.getItem('tabsy-auth-session')
      if (storedSession) {
        const parsedSession: AuthSession = JSON.parse(storedSession)
        
        // Check if token is still valid
        if (parsedSession.expiresAt > Date.now()) {
          setSession(parsedSession)
          
          // Set token in API client
          apiClient.setAuthToken(parsedSession.token)
          
          // Try to verify token with server (optional verification)
          try {
            const timeoutPromise = new Promise<null>((_, reject) => {
              setTimeout(() => reject(new Error('Token verification timeout')), 5000) // 5 second timeout
            })
            
            const verificationPromise = apiClient.auth.getCurrentUser()
            
            const currentUser = await Promise.race([verificationPromise, timeoutPromise])
            if (currentUser) {
              // Update user data if available
              setSession(prev => prev ? { ...prev, user: currentUser } : null)
              console.log('Token verification successful')
            }
          } catch (error) {
            // Don't logout on verification failure - the stored session might still be valid
            // Only logout if we get a specific 401/403 authentication error
            console.warn('Token verification failed, but keeping stored session:', error)
            
            // If it's a specific authentication error (401/403), then logout
            if (error && typeof error === 'object' && 'status' in error) {
              const statusError = error as { status: number }
              if (statusError.status === 401 || statusError.status === 403) {
                console.log('Authentication error detected, clearing session')
                await logout()
                return
              }
            }
            
            // For network errors, timeouts, etc., keep the session and let the user try to use it
            console.log('Keeping session despite verification failure - might be network issue')
          }
        } else {
          // Token expired, try to refresh
          try {
            await refreshStoredSession(parsedSession)
          } catch (error) {
            console.warn('Token refresh failed, clearing session:', error)
            // Only logout if refresh fails - this is a legitimate reason to logout
            await logout()
          }
        }
      }
    } catch (error) {
      console.error('Error loading stored session:', error)
    } finally {
      setIsLoading(false)
    }
  }, [apiClient])

  const refreshStoredSession = useCallback(async (storedSession: AuthSession) => {
    try {
      const response = await apiClient.auth.refreshToken(storedSession.refreshToken)
      if (response && response.token) {
        const newSession: AuthSession = {
          user: storedSession.user, // Keep existing user data
          token: response.token,
          refreshToken: storedSession.refreshToken, // Keep existing refresh token
          expiresAt: response.expiresAt || (Date.now() + (3600 * 1000)) // Default 1 hour
        }
        
        setSession(newSession)
        localStorage.setItem('tabsy-auth-session', JSON.stringify(newSession))
        apiClient.setAuthToken(newSession.token)
        console.log('Token refresh successful')
      } else {
        throw new Error('Token refresh failed - no token in response')
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      throw error
    }
  }, [apiClient])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await apiClient.auth.login({ email, password })
      
      if (response && response.user && response.token) {
        const newSession: AuthSession = {
          user: response.user,
          token: response.token,
          refreshToken: response.refreshToken,
          expiresAt: response.expiresAt || (Date.now() + (3600 * 1000)) // Default 1 hour
        }
        
        setSession(newSession)
        localStorage.setItem('tabsy-auth-session', JSON.stringify(newSession))
        apiClient.setAuthToken(newSession.token)
      } else {
        throw new Error('Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [apiClient])

  const register = useCallback(async (userData: RegisterData) => {
    setIsLoading(true)
    try {
      const response = await apiClient.auth.register(userData)
      
      if (response && response.user && response.token) {
        const newSession: AuthSession = {
          user: response.user,
          token: response.token,
          refreshToken: response.refreshToken,
          expiresAt: response.expiresAt || (Date.now() + (3600 * 1000)) // Default 1 hour
        }
        
        setSession(newSession)
        localStorage.setItem('tabsy-auth-session', JSON.stringify(newSession))
        apiClient.setAuthToken(newSession.token)
      } else {
        throw new Error('Registration failed')
      }
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [apiClient])

  const logout = useCallback(async () => {
    setIsLoading(true)
    try {
      if (session?.token) {
        await apiClient.auth.logout()
      }
    } catch (error) {
      console.error('Logout error:', error)
      // Continue with logout even if API call fails
    } finally {
      setSession(null)
      localStorage.removeItem('tabsy-auth-session')
      apiClient.clearAuthToken()
      setIsLoading(false)
    }
  }, [apiClient, session])

  const refreshAuth = useCallback(async () => {
    if (!session?.refreshToken) {
      throw new Error('No refresh token available')
    }
    
    try {
      await refreshStoredSession(session)
    } catch (error) {
      console.error('Auth refresh error:', error)
      await logout()
      throw error
    }
  }, [session, refreshStoredSession, logout])

  const hasRole = useCallback((role: UserRole | UserRole[]): boolean => {
    if (!session?.user) return false
    
    const userRole = session.user.role
    if (Array.isArray(role)) {
      return role.includes(userRole)
    }
    return userRole === role
  }, [session])

  const checkPermission = useCallback((permission: string): boolean => {
    if (!session?.user) return false
    
    // Define role-based permissions
    const rolePermissions: Record<UserRole, string[]> = {
      [UserRole.ADMIN]: ['*'], // Admin has all permissions
      [UserRole.RESTAURANT_OWNER]: [
        'restaurant:read',
        'restaurant:update',
        'menu:read',
        'menu:write',
        'orders:read',
        'orders:update',
        'analytics:read',
        'staff:manage'
      ],
      [UserRole.RESTAURANT_STAFF]: [
        'restaurant:read',
        'menu:read',
        'orders:read',
        'orders:update'
      ],
      [UserRole.CUSTOMER]: [
        'menu:read',
        'orders:create',
        'profile:read',
        'profile:update'
      ]
    }
    
    const userPermissions = rolePermissions[session.user.role] || []
    return userPermissions.includes('*') || userPermissions.includes(permission)
  }, [session])

  const value: AuthContextValue = {
    session,
    user: session?.user || null,
    isAuthenticated: !!session,
    isLoading,
    login,
    logout,
    register,
    refreshAuth,
    hasRole,
    checkPermission
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}