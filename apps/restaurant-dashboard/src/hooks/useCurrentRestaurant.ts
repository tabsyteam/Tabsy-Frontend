import { useAuth } from '@tabsy/ui-components'
import { createRestaurantHooks } from '@tabsy/react-query-hooks'
import { User, UserRole } from '@tabsy/shared-types'
import { useQuery } from '@tanstack/react-query'
import { useRef, useEffect } from 'react'

/**
 * Hook to get the current user's restaurant ID and restaurant data
 * For restaurant staff/owners, this will return their restaurant ID and details
 */
export function useCurrentRestaurant() {
  const { user, isLoading: authLoading, isVerifying } = useAuth()
  const errorLoggedRef = useRef(false)
  const errorTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // PERFORMANCE: Reduce excessive logging - only log when debugging is specifically enabled
  if (process.env.NODE_ENV === 'development' && process.env.DEBUG_RESTAURANT_HOOK) {
    console.log('🔍 useCurrentRestaurant - User object:', {
      user,
      hasRestaurantOwner: !!(user as any)?.restaurantOwner,
      hasRestaurantStaff: !!(user as any)?.restaurantStaff,
      restaurantOwnerId: (user as any)?.restaurantOwner?.restaurantId,
      restaurantStaffId: (user as any)?.restaurantStaff?.restaurantId,
      role: user?.role,
      authLoading,
      isVerifying
    })
  }

  // Create restaurant hooks using the factory pattern
  const restaurantHooks = createRestaurantHooks(useQuery)

  // CRITICAL: Only check restaurant access after auth is fully complete
  // This prevents the race condition where user role is checked before relationships are loaded
  const isAuthComplete = !authLoading && !isVerifying && !!user

  // Determine if user has restaurant access
  const isRestaurantUser = isAuthComplete && ((user as User)?.role === UserRole.RESTAURANT_OWNER || (user as User)?.role === UserRole.RESTAURANT_STAFF)

  // Get restaurant ID from user data - extract from restaurant relationships
  // For restaurant owners: user.restaurantOwner.restaurantId
  // For restaurant staff: user.restaurantStaff.restaurantId
  // IMPORTANT: Only extract restaurantId when auth is complete to avoid race conditions
  const restaurantId = isAuthComplete && isRestaurantUser
    ? (user as any)?.restaurantOwner?.restaurantId || (user as any)?.restaurantStaff?.restaurantId
    : undefined

  // Debug: Log what we're actually receiving from the API
  console.log('🔍 useCurrentRestaurant - Debug API response:', {
    userId: user?.id,
    userRole: user?.role,
    restaurantOwner: (user as any)?.restaurantOwner,
    restaurantStaff: (user as any)?.restaurantStaff,
    restaurantId,
    authLoading,
    isVerifying
  })

  // Handle missing restaurant relationships - only check after auth is complete
  useEffect(() => {
    // Only run this check when authentication is fully complete
    if (isAuthComplete && isRestaurantUser && !restaurantId && user) {
      // Clear any existing timeout
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
      }

      // Set a timeout to wait for data to load properly
      // This gives time for any remaining async operations to complete
      errorTimeoutRef.current = setTimeout(() => {
        if (!errorLoggedRef.current && !restaurantId) {
          console.error('❌ Restaurant user found but no restaurant relationships in database. User needs to be properly associated with a restaurant.')
          console.error('User data:', {
            id: user?.id,
            email: user?.email,
            role: user?.role,
            restaurantOwner: (user as any)?.restaurantOwner,
            restaurantStaff: (user as any)?.restaurantStaff
          })
          errorLoggedRef.current = true
        }
      }, 2000) // Reduced timeout since auth is already complete
    } else if (restaurantId) {
      // Reset error logged flag if we now have a restaurant ID
      errorLoggedRef.current = false
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
      }
    }

    // Cleanup timeout on unmount
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
      }
    }
  }, [isAuthComplete, isRestaurantUser, restaurantId, user])
  
  // Fetch restaurant details if we have a restaurant ID
  const {
    data: restaurantData,
    isLoading: restaurantLoading,
    error: restaurantError,
    refetch: refetchRestaurant
  } = restaurantHooks.useRestaurant(restaurantId || '')
  
  // Extract restaurant from the API response
  const restaurant = restaurantData?.data || null
  
  return {
    restaurantId,
    restaurant,
    isLoading: authLoading || isVerifying || (isAuthComplete && isRestaurantUser && restaurantLoading),
    error: restaurantError || (isAuthComplete && isRestaurantUser && !restaurantId ? 'User not associated with any restaurant' : null),
    refetch: refetchRestaurant,
    hasRestaurantAccess: isAuthComplete && isRestaurantUser && !!restaurantId
  }
}