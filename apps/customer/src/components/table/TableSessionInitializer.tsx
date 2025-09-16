'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { TabsySplash } from '@/components/splash/TabsySplash'
import { useApi } from '@/components/providers/api-provider'
import { toast } from 'sonner'

interface TableSessionInitializerProps {
  restaurantId: string
  tableId: string
}

interface TableInfo {
  restaurant: {
    id: string
    name: string
    logo?: string
    theme?: string
  }
  table: {
    id: string
    number: string
    qrCode: string
  }
  isActive: boolean
}


export function TableSessionInitializer({ restaurantId, tableId }: TableSessionInitializerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { api } = useApi()

  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Try to fetch restaurant and table data, but handle gracefully if not found (for testing)
        console.log('TableSessionInitializer: Attempting to fetch table info for:', { restaurantId, tableId })

        let restaurant = null
        let table = null

        try {
          // Try to get restaurant information
          const restaurantResponse = await api.restaurant.getById(restaurantId)
          if (restaurantResponse.success && restaurantResponse.data) {
            restaurant = restaurantResponse.data
          }

          // Try to get table information
          const tableResponse = await api.table.getById(restaurantId, tableId)
          if (tableResponse.success && tableResponse.data) {
            table = tableResponse.data

            // Verify table belongs to restaurant if both exist
            if (restaurant && table.restaurantId !== restaurantId) {
              throw new Error('Table does not belong to this restaurant')
            }

            // Check if table is available for ordering
            if (table.status !== 'AVAILABLE' && table.status !== 'OCCUPIED') {
              console.warn(`TableSessionInitializer: Table status is ${table.status}, but continuing for development`)
            }
          }
        } catch (fetchError) {
          console.warn('TableSessionInitializer: Could not fetch restaurant/table data from database:', fetchError)
          console.log('TableSessionInitializer: This is normal for development with test data')
        }

        // Use real data if available, otherwise create development placeholders
        if (!restaurant) {
          restaurant = {
            id: restaurantId,
            name: 'Development Restaurant',
            description: 'Test restaurant for development',
            logo: undefined,
            theme: undefined
          }
        }

        if (!table) {
          table = {
            id: tableId,
            number: tableId.replace('table-', '') || '1',
            restaurantId: restaurantId,
            qrCode: undefined, // No QR code for development
            status: 'AVAILABLE',
            seats: 4
          }
        }

        setTableInfo({
          restaurant: {
            id: restaurant.id,
            name: restaurant.name,
            logo: restaurant.logo || undefined,
            theme: (restaurant as any).theme
          },
          table: {
            id: table.id,
            number: table.number,
            qrCode: table.qrCode || ''
          },
          isActive: true
        })

        // Store table and restaurant info in sessionStorage
        sessionStorage.setItem('tabsy-table-info', JSON.stringify({
          restaurant: {
            id: restaurant.id,
            name: restaurant.name,
            logo: restaurant.logo || undefined,
            theme: (restaurant as any).theme
          },
          table: {
            id: table.id,
            number: table.number,
            qrCode: table.qrCode || ''
          },
          qrCode: table.qrCode
        }))

        // Clear any existing session data first
        sessionStorage.removeItem('tabsy-session')

        // Create a guest session (only include QR code if available)
        console.log('TableSessionInitializer: Creating guest session')
        const sessionRequest: any = {
          tableId: table.id,
          restaurantId: restaurant.id
        }

        // Only include QR code if it exists (for production with real tables)
        if (table.qrCode) {
          sessionRequest.qrCode = table.qrCode
          console.log('TableSessionInitializer: Using real QR code for session creation')
        } else {
          console.log('TableSessionInitializer: Creating session without QR code (development mode)')
        }

        const guestSessionResponse = await api.session.createGuest(sessionRequest)

        if (!guestSessionResponse.success || !guestSessionResponse.data) {
          throw new Error('Failed to create guest session')
        }

        const sessionData = {
          sessionId: guestSessionResponse.data.sessionId,
          restaurantId: restaurant.id,
          tableId: table.id,
          expiresAt: guestSessionResponse.data.expiresAt,
          createdAt: new Date().toISOString()
        }

        // Store session and set it in the API client
        console.log('TableSessionInitializer: Storing guest session:', { sessionId: sessionData.sessionId })
        sessionStorage.setItem('tabsy-session', JSON.stringify(sessionData))

        // Set session in API client
        api.setGuestSession(sessionData.sessionId)
        console.log('TableSessionInitializer: Guest session created and stored successfully')

        // Show welcome message
        toast.success(`Welcome to ${restaurant.name}!`, {
          description: `Table ${table.number} is ready for ordering`
        })

        // After a brief delay for the splash animation, navigate to menu
        setTimeout(() => {
          router.push(`/menu?restaurant=${restaurant.id}&table=${table.id}`)
        }, 2500)

      } catch (error: any) {
        console.error('Session initialization error:', error)

        let errorMessage = 'Failed to connect to your table. Please try scanning the QR code again.'

        if (error?.response?.status === 404) {
          errorMessage = 'This table was not found. Please check with restaurant staff.'
        } else if (error?.response?.status === 403) {
          errorMessage = 'This table is not available for ordering at the moment.'
        } else if (error?.message?.includes('mismatch')) {
          errorMessage = 'Invalid table link. Please scan the QR code at your table.'
        }

        setError(errorMessage)

        // Show error toast with option to go back to scanner
        toast.error('Connection Failed', {
          description: errorMessage,
          action: {
            label: 'Scan QR Code',
            onClick: () => router.push('/')
          }
        })
      } finally {
        setIsLoading(false)
      }
    }

    initializeSession()
  }, [restaurantId, tableId, api, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Unable to Connect
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {error}
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Scan QR Code
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Connecting to your table...
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Please wait while we set up your dining experience
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (tableInfo) {
    return (
      <TabsySplash
        restaurant={tableInfo.restaurant}
        table={tableInfo.table}
      />
    )
  }

  return null
}