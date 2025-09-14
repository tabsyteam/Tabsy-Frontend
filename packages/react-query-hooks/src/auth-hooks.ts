import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TabsyAPI } from '@tabsy/api-client'

export const QUERY_KEYS = {
  auth: {
    profile: ['auth', 'profile'] as const,
    permissions: ['auth', 'permissions'] as const,
  },
  restaurants: {
    all: ['restaurants'] as const,
    detail: (id: string) => ['restaurants', id] as const,
    menu: (id: string) => ['restaurants', id, 'menu'] as const,
    tables: (id: string) => ['restaurants', id, 'tables'] as const,
    analytics: (id: string) => ['restaurants', id, 'analytics'] as const,
  },
  menus: {
    all: ['menus'] as const,
    detail: (id: string) => ['menus', id] as const,
    items: (menuId: string) => ['menus', menuId, 'items'] as const,
    categories: (menuId: string) => ['menus', menuId, 'categories'] as const,
  },
  orders: {
    all: ['orders'] as const,
    detail: (id: string) => ['orders', id] as const,
    byTable: (tableId: string) => ['orders', 'table', tableId] as const,
    byRestaurant: (restaurantId: string) => ['orders', 'restaurant', restaurantId] as const,
    history: (filters?: any) => ['orders', 'history', filters] as const,
  },
  tables: {
    all: ['tables'] as const,
    detail: (id: string) => ['tables', id] as const,
    byRestaurant: (restaurantId: string) => ['tables', 'restaurant', restaurantId] as const,
    qrCode: (id: string) => ['tables', id, 'qr-code'] as const,
  },
  payments: {
    all: ['payments'] as const,
    detail: (id: string) => ['payments', id] as const,
    byOrder: (orderId: string) => ['payments', 'order', orderId] as const,
    methods: ['payments', 'methods'] as const,
  },
  users: {
    all: ['users'] as const,
    detail: (id: string) => ['users', id] as const,
    profile: ['users', 'profile'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    unread: ['notifications', 'unread'] as const,
    preferences: ['notifications', 'preferences'] as const,
  },
  health: {
    status: ['health', 'status'] as const,
    metrics: ['health', 'metrics'] as const,
  }
} as const

// Authentication Hooks
export function useLogin() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (credentials: any) => {
      const client = new TabsyAPI()
      return await client.auth.login(credentials)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.profile })
    }
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: any) => {
      const client = new TabsyAPI()
      return await client.auth.register(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.profile })
    }
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const client = new TabsyAPI()
      return await client.auth.logout()
    },
    onSuccess: () => {
      queryClient.clear()
    }
  })
}

export function useProfile() {
  return useQuery({
    queryKey: QUERY_KEYS.auth.profile,
    queryFn: async () => {
      const client = new TabsyAPI()
      return await client.user.getCurrentUser()
    }
  })
}

export function useRefreshToken() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (refreshToken: string) => {
      const client = new TabsyAPI()
      return await client.auth.refreshToken(refreshToken)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.profile })
    }
  })
}
