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
  
  // Create restaurant hooks using the factory pattern
  const restaurantHooks = createRestaurantHooks(useQuery)
  
  // For now, we'll use a mock restaurant ID based on user role
  // In a real app, you'd fetch restaurants by owner or staff assignment
  const isRestaurantUser = (user as User)?.role === UserRole.RESTAURANT_OWNER || (user as User)?.role === UserRole.RESTAURANT_STAFF
  
  // For demonstration, we'll use the test restaurant ID that matches the backend
  // In production, you'd fetch this from the user's associated restaurants
  const restaurantId = isRestaurantUser ? 'test-restaurant-id' : undefined
  
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