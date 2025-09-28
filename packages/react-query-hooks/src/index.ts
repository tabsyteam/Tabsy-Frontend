// Authentication hooks
export {
  useLogin,
  useRegister,
  useLogout,
  useProfile,
  useRefreshToken
} from './auth-hooks'

// Restaurant hooks - Using factory pattern to prevent QueryClient context errors
export {
  createRestaurantHooks
} from './restaurant-hooks'

// Dashboard hooks
export {
  createDashboardHooks,
  useTodayOrders,
  type DashboardMetrics
} from './dashboard-hooks'

// Menu hooks
export {
  createMenuHooks,
  useCreateMenu,
  useUpdateMenu,
  useDeleteMenu,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem
} from './menu-hooks'

// Order hooks
export {
  createOrderHooks,
  useOrdersByRestaurant,
  useCreateOrder,
  useUpdateOrder,
  useUpdateOrderStatus,
  useCancelOrder,
  useAddOrderItem,
  useUpdateOrderItem,
  useRemoveOrderItem
} from './order-hooks'

// Table hooks
export {
  createTableHooks,
  useCreateTable,
  useUpdateTable,
  useDeleteTable,
  useUpdateTableStatus,
  useResetTable
} from './table-hooks'

// Payment hooks
export {
  createPaymentHooks,
  useCreatePaymentIntent,
  useCreateOrderPayment,
  useUpdatePaymentStatus,
  useCompleteCashPayment,
  useCreateSplitPayment,
  useDeletePayment
} from './payment-hooks'

// Notification hooks - Temporarily disabled to prevent QueryClient context errors
// TODO: Fix notification hooks to not call useQueryClient() at module load time
// export {
//   useSendNotification,
//   useMarkNotificationAsRead,
//   useMarkMultipleNotificationsAsRead,
//   useClearAllNotifications,
//   useUpdateNotificationPreferences,
//   useTestNotification
// } from './notification-hooks'

// Factory function for notification hooks (requires useQuery)
export { createNotificationHooks } from './notification-hooks'

// User hooks
export {
  createUserHooks,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useUpdateUserStatus,
  useUpdateUserRoles
} from './user-hooks'

// Session and QR Access hooks
export {
  useSession,
  useSessionValidation,
  useTableInfo,
  useCreateGuestSession,
  useCreateGuestSessionFromQR,
  useUpdateSession,
  useDeleteSession,
  usePingSession
} from './session-hooks'

// Feedback hooks
export {
  useCreateFeedback,
  useFeedback,
  useRestaurantFeedback,
  useFeedbackStats,
  useUploadFeedbackPhotos,
  useDeleteFeedbackPhoto,
  useFlagFeedback,
  useAdminFeedback,
  useAdminFeedbackStats,
  usePrefetchFeedback,
  useInvalidateFeedback,
  FEEDBACK_KEYS
} from './feedback-hooks'

// Utility hooks
export { useClientSafeQuery } from './useClientSafeQuery'

// QUERY_KEYS
export { QUERY_KEYS } from './auth-hooks'
