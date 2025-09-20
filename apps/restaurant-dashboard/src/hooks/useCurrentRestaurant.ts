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
    role: user?.role,
    fullUserObject: JSON.stringify(user, null, 2)
  })

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

  // Handle missing restaurant relationships properly
  if (isRestaurantUser && !restaurantId) {
    console.error('❌ Restaurant user found but no restaurant relationships in database. User needs to be properly associated with a restaurant.')
    // Don't use a hardcoded fallback - this indicates a data integrity issue that should be resolved
  }
  
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