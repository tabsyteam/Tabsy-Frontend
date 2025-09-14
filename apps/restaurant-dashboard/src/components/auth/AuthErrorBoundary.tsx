'use client'

import React from 'react'
import { Button } from '@tabsy/ui-components'
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react'
import { useAuth } from '@tabsy/ui-components'
import { useRouter } from 'next/navigation'

interface AuthErrorBoundaryProps {
  children: React.ReactNode
  error?: Error | null
}

export function AuthErrorBoundary({ children, error }: AuthErrorBoundaryProps) {
  const auth = useAuth()
  const router = useRouter()

  // Check if the error is authentication-related
  const isAuthError = error && (
    (error as any)?.status === 401 ||
    (error as any)?.status === 403 ||
    error.message?.includes('401') ||
    error.message?.includes('Unauthorized') ||
    error.message?.includes('Authentication required')
  )

  const handleRetry = () => {
    // Try to refresh the auth token first
    if (auth.session?.refreshToken) {
      auth.refreshAuth().catch(() => {
        // If refresh fails, redirect to login
        handleLoginRedirect()
      })
    } else {
      // No refresh token, reload the page
      window.location.reload()
    }
  }

  const handleLoginRedirect = async () => {
    await auth.logout()
    router.push('/login')
  }

  if (isAuthError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Authentication Required</h2>
            <p className="mt-2 text-gray-600">
              Your session has expired or you don't have permission to access this resource.
            </p>
            <div className="mt-6 flex flex-col space-y-3">
              <Button 
                onClick={handleRetry}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button 
                variant="outline"
                onClick={handleLoginRedirect}
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign In Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // For non-auth errors, just render children
  return <>{children}</>
}