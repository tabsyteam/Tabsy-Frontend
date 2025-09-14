"use client";
import React, { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { LoadingSpinner } from '../components/LoadingComponents';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  fallback?: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  fallback = null,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  // Show loading while auth state is being determined
  if (isLoading) {
    return <LoadingSpinner size="xl" />;
  }

  // Not authenticated
  if (!user) {
    if (typeof window !== 'undefined' && redirectTo) {
      window.location.href = redirectTo;
      return <LoadingSpinner size="xl" />;
    }
    return fallback || <div>Access denied. Please login.</div>;
  }

  // Check role requirements
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return fallback || <div>Access denied. Insufficient permissions.</div>;
  }

  return <>{children}</>;
}

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles?: string[]
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute requiredRoles={requiredRoles}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}