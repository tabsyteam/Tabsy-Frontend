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
  const { user, isLoading: authLoading } = useAuth()
  const errorLoggedRef = useRef(false)
  const errorTimeoutRef = useRef<NodeJS.Timeout>()

  // PERFORMANCE: Reduce excessive logging - only log when debugging is specifically enabled
  if (process.env.NODE_ENV === 'development' && process.env.DEBUG_RESTAURANT_HOOK) {
    console.log('🔍 useCurrentRestaurant - User object:', {
      user,
      hasRestaurantOwner: !!(user as any)?.restaurantOwner,
      hasRestaurantStaff: !!(user as any)?.restaurantStaff,
      restaurantOwnerId: (user as any)?.restaurantOwner?.restaurantId,
      restaurantStaffId: (user as any)?.restaurantStaff?.restaurantId,
      role: user?.role
    })
  }

  // Create restaurant hooks using the factory pattern
  const restaurantHooks = createRestaurantHooks(useQuery)
  
  // Determine if user has restaurant access
  const isRestaurantUser = (user as User)?.role === UserRole.RESTAURANT_OWNER || (user as User)?.role === UserRole.RESTAURANT_STAFF

  // Get restaurant ID from user data - extract from restaurant relationships
  // For restaurant owners: user.restaurantOwner.restaurantId
  // For restaurant staff: user.restaurantStaff.restaurantId
  let restaurantId = isRestaurantUser
    ? (user as any)?.restaurantOwner?.restaurantId || (user as any)?.restaurantStaff?.restaurantId
    : undefined

  // Handle missing restaurant relationships properly - debounced error logging
  useEffect(() => {
    if (isRestaurantUser && !restaurantId && user && !authLoading) {
      // Clear any existing timeout
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
      }

      // Set a new timeout to log the error after a delay (to avoid logging during rapid state changes)
      errorTimeoutRef.current = setTimeout(() => {
        if (!errorLoggedRef.current) {
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
      }, 1000) // Wait 1 second before logging to allow auth state to stabilize
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
  }, [isRestaurantUser, restaurantId, user, authLoading])
  
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
    isLoading: restaurantLoading,
    error: restaurantError || (isRestaurantUser && !restaurantId ? 'User not associated with any restaurant' : null),
    refetch: refetchRestaurant,
    hasRestaurantAccess: isRestaurantUser && !!restaurantId
  }
}