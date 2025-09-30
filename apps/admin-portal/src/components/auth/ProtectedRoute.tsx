'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@tabsy/ui-components';
import { UserRole } from '@tabsy/shared-types';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
  redirectTo?: string;
}

/**
 * ProtectedRoute component for admin portal
 * Ensures user is authenticated and has admin role
 */
export function ProtectedRoute({ 
  children, 
  requiredRoles = [UserRole.ADMIN],
  redirectTo = '/login'
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
      const userWithRole = user as { role?: UserRole };
      
      // Check if user has required role (must be admin)
      if (!userWithRole?.role || !requiredRoles.includes(userWithRole.role)) {
        // User doesn't have admin role
        if (userWithRole?.role === UserRole.RESTAURANT_OWNER || userWithRole?.role === UserRole.RESTAURANT_STAFF) {
          // Restaurant user - redirect to restaurant dashboard
          window.location.href = 'http://localhost:3000/dashboard';
          return;
        } else if (userWithRole?.role === UserRole.CUSTOMER) {
          // Customer user - redirect to customer app
          window.location.href = 'http://localhost:3001';
          return;
        } else {
          // Unknown role - show unauthorized page
          router.push('/unauthorized');
          return;
        }
      }
    }
  }, [isAuthenticated, user, isLoading, router, requiredRoles, redirectTo]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full"></div>
          <p className="text-content-secondary">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Don't render children until auth is verified
  if (!isAuthenticated || !user) {
    return null;
  }

  const userWithRole = user as { role?: UserRole };

  // Check role access (admin only)
  if (!userWithRole?.role || !requiredRoles.includes(userWithRole.role)) {
    return (
      <div className="min-h-screen bg-surface-secondary flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="bg-surface rounded-lg shadow-lg p-6">
            <div className="mb-4">
              <div className="mx-auto h-16 w-16 bg-status-error-light rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-status-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <h1 className="text-xl font-bold text-content-primary mb-2">Admin Access Required</h1>
            <p className="text-content-secondary mb-4">
              You need administrator privileges to access this portal.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
              >
                Sign In as Administrator
              </button>
              <div className="text-sm text-content-secondary">
                Other access options:
              </div>
              <button
                onClick={() => window.location.href = 'http://localhost:3000/login'}
                className="w-full bg-status-warning-light text-status-warning-dark px-4 py-2 rounded-lg hover:bg-status-warning transition-colors"
              >
                Restaurant Portal
              </button>
              <button
                onClick={() => window.location.href = 'http://localhost:3001'}
                className="w-full bg-status-success-light text-status-success-dark px-4 py-2 rounded-lg hover:bg-status-success transition-colors"
              >
                Customer App
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated and authorized as admin
  return <>{children}</>;
}