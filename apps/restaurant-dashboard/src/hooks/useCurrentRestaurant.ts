import { useAuth } from '@tabsy/ui-components'
import { createRestaurantHooks } from '@tabsy/react-query-hooks'
import { User, UserRole } from '@tabsy/shared-types'
import { useQuery } from '@tanstack/react-query'

/**
 * Hook to get the current user's restaurant ID and restaurant data
 * For restaurant staff/owners, this will return their restaurant ID and details
 */
export function useCurrentRestaurant() {
  const { user } = useAuth()

  // Debug log to understand user structure
  console.log('🔍 useCurrentRestaurant - User object:', {
    user,
    hasRestaurantOwner: !!(user as any)?.restaurantOwner,
    hasRestaurantStaff: !!(user as any)?.restaurantStaff,
    restaurantOwnerId: (user as any)?.restaurantOwner?.restaurantId,
    restaurantStaffId: (user as any)?.restaurantStaff?.restaurantId,
    role: user?.role
  })

  // Create restaurant hooks using the factory pattern
  const restaurantHooks = createRestaurantHooks(useQuery)
  
  // Determine if user has restaurant access
  const isRestaurantUser = (user as User)?.role === UserRole.RESTAURANT_OWNER || (user as User)?.role === UserRole.RESTAURANT_STAFF

  // Get restaurant ID from user data - extract from restaurant relationships
  // For restaurant owners: user.restaurantOwner.restaurantId
  // For restaurant staff: user.restaurantStaff.restaurantId
  const restaurantId = isRestaurantUser
    ? (user as any)?.restaurantOwner?.restaurantId || (user as any)?.restaurantStaff?.restaurantId
    : undefined
  
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
    error: restaurantError,
    refetch: refetchRestaurant,
    hasRestaurantAccess: isRestaurantUser
  }
}