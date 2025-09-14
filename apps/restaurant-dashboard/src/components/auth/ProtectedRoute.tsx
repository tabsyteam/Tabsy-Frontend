'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@tabsy/ui-components';
import { UserRole } from '@tabsy/shared-types';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
  redirectTo?: string;
  requireRestaurantAccess?: boolean;
}

/**
 * ProtectedRoute component for restaurant dashboard
 * Ensures user is authenticated and has appropriate roles
 */
export function ProtectedRoute({ 
  children, 
  requiredRoles = [UserRole.RESTAURANT_OWNER, UserRole.RESTAURANT_STAFF, UserRole.ADMIN],
  redirectTo = '/login',
  requireRestaurantAccess = true
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      // Not authenticated - redirect to login
      if (!isAuthenticated || !user) {
        router.push(redirectTo);
        return;
      }

      // Type-safe check for user properties
      const typedUser = user as { role?: UserRole };
      
      // Check if user has required role
      if (!typedUser?.role || !requiredRoles.includes(typedUser.role)) {
        // User doesn't have required role
        if (typedUser?.role === UserRole.ADMIN) {
          // Admin trying to access restaurant - allow it
          return;
        } else if (typedUser?.role === UserRole.CUSTOMER) {
          // Customer user - redirect to customer app
          window.location.href = 'http://localhost:3001';
          return;
        } else {
          // Other roles - show unauthorized page
          router.push('/unauthorized');
          return;
        }
      }

      // Check restaurant access if required
      if (requireRestaurantAccess && typedUser?.role !== UserRole.ADMIN) {
        // For development/demo purposes, allow restaurant staff without restaurantId
        // In production, you would uncomment the following lines:
        /*
        if (!(typedUser as { restaurantId?: string })?.restaurantId) {
          router.push('/setup-restaurant');
          return;
        }
        */
      }
    }
  }, [isAuthenticated, user, isLoading, router, requiredRoles, redirectTo, requireRestaurantAccess]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 mx-auto mb-4 border-2 border-orange-600 border-t-transparent rounded-full"></div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Don't render children until auth is verified
  if (!isAuthenticated || !user) {
    return null;
  }

  const typedUser = user as { role?: UserRole };

  // Check role access
  if (!typedUser?.role || (!requiredRoles.includes(typedUser.role) && typedUser.role !== UserRole.ADMIN)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-4">
              <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">
              You don&apos;t have permission to access the restaurant dashboard.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Sign In with Different Account
              </button>
              <button
                onClick={() => window.location.href = 'http://localhost:3001'}
                className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Go to Customer App
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated and authorized
  return <>{children}</>;
}