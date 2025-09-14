"use client";
import React, { ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string[];
  fallback?: ReactNode;
  requireAll?: boolean;
}

export function RoleGuard({ 
  children, 
  allowedRoles, 
  fallback = null,
  requireAll = false 
}: RoleGuardProps) {
  const { user, hasRole } = useAuth();

  if (!user) {
    return fallback;
  }

  const hasAccess = requireAll 
    ? allowedRoles.every(role => hasRole(role as any))
    : allowedRoles.some(role => hasRole(role as any));

  return hasAccess ? <>{children}</> : fallback;
}

// Convenience components for common roles
export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={['admin']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function RestaurantManagerOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={['restaurant_manager']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function StaffOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={['staff', 'restaurant_manager', 'admin']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function CustomerOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={['customer']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}