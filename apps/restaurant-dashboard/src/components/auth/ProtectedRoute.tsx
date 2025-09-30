'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@tabsy/ui-components';
import { UserRole } from '@tabsy/shared-types';
import { logger } from '@/lib/logger';
import { APP_URLS } from '@/lib/constants';

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
  const { isAuthenticated, user, isLoading, isVerifying } = useAuth();

  useEffect(() => {
    // Wait for both loading and verification to complete
    if (!isLoading && !isVerifying) {
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
          window.location.href = APP_URLS.CUSTOMER;
          return;
        } else {
          // Other roles - redirect to login with error message
          logger.warn('User with invalid role trying to access restaurant dashboard', { role: typedUser?.role });
          router.push('/login?error=unauthorized_role');
          return;
        }
      }

      // Check restaurant access if required
      if (requireRestaurantAccess && typedUser?.role !== UserRole.ADMIN) {
        // Check if user has restaurant relationships
        const hasRestaurantOwner = !!(user as any)?.restaurantOwner
        const hasRestaurantStaff = !!(user as any)?.restaurantStaff
        const restaurantId = (user as any)?.restaurantOwner?.restaurantId || (user as any)?.restaurantStaff?.restaurantId

        if (!hasRestaurantOwner && !hasRestaurantStaff && !restaurantId) {
          logger.warn('Restaurant access required but user has no restaurant relationships');
          router.push('/login?error=no_restaurant_access');
          return;
        }
      }
    }
  }, [isAuthenticated, user, isLoading, isVerifying, router, requiredRoles, redirectTo, requireRestaurantAccess]);

  // Show loading state while loading or verifying auth
  if (isLoading || isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full"></div>
          <p className="text-content-secondary">
            {isVerifying ? 'Verifying credentials...' : 'Authenticating...'}
          </p>
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="bg-surface rounded-lg shadow-lg p-6">
            <div className="mb-4">
              <div className="mx-auto h-16 w-16 bg-status-error-light rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-status-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <h1 className="text-xl font-bold text-content-primary mb-2">Access Denied</h1>
            <p className="text-content-secondary mb-4">
              You don&apos;t have permission to access the restaurant dashboard.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors"
              >
                Sign In with Different Account
              </button>
              <button
                onClick={() => window.location.href = APP_URLS.CUSTOMER}
                className="w-full bg-surface-secondary text-content-secondary px-4 py-2 rounded-lg hover:bg-surface-tertiary transition-colors"
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