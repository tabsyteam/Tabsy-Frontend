'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Shield, ShieldCheck } from 'lucide-react';
import { LoginForm, useAuth } from '@tabsy/ui-components';
import { UserRole } from '@tabsy/shared-types';

export default function AdminLoginPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user && 'role' in user) {
      const userRole = user.role;
      if (userRole === UserRole.ADMIN) {
        router.push('/dashboard');
      } else if (userRole === UserRole.RESTAURANT_OWNER || userRole === UserRole.RESTAURANT_STAFF) {
        // Not an admin, redirect to restaurant dashboard
        window.location.href = 'http://localhost:3000/dashboard';
      } else {
        // Customer user, redirect to customer app
        window.location.href = 'http://localhost:3001';
      }
    }
  }, [isAuthenticated, user, router]);

  const handleLoginSuccess = () => {
    // The redirect logic is handled above in useEffect
    // This is just a fallback
    router.push('/dashboard');
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-theme-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 mx-auto mb-4 border-2 border-theme-primary border-t-transparent rounded-full"></div>
          <p className="text-theme-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto h-16 w-16 bg-theme-primary rounded-full flex items-center justify-center shadow-lg">
            <Shield className="h-8 w-8 text-theme-surface" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-theme-text-primary">Admin Portal</h1>
            <p className="text-theme-text-secondary mt-2">Secure access to system administration</p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-theme-primary-light border border-theme-border rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <ShieldCheck className="h-5 w-5 text-theme-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <h3 className="font-medium text-theme-text-primary mb-1">Secure Admin Access</h3>
              <p className="text-theme-text-secondary">
                This portal is for authorized administrators only. All access is monitored and logged.
              </p>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-theme-surface rounded-lg shadow-lg p-6">
          <LoginForm 
            onSuccess={handleLoginSuccess}
            redirectTo="/dashboard"
            showRegisterLink={false}
          />
        </div>

        {/* Footer */}
        <div className="text-center space-y-4">
          <div className="text-sm text-theme-text-secondary">
            Need admin account access?{' '}
            <a
              href="mailto:admin@tabsy.com"
              className="text-theme-primary hover:text-theme-primary-hover hover:underline font-medium transition-colors"
            >
              Contact system administrator
            </a>
          </div>
          
          <div className="text-xs text-theme-text-muted space-y-1">
            <div>
              For technical support:{' '}
              <a
                href="mailto:support@tabsy.com"
                className="text-theme-primary hover:text-theme-primary-hover hover:underline transition-colors"
              >
                support@tabsy.com
              </a>
            </div>
            <div className="text-theme-text-muted">
              Restaurant access:{' '}
              <a
                href="http://localhost:3000/login"
                className="text-theme-primary hover:text-theme-primary-hover hover:underline transition-colors"
              >
                Restaurant Portal
              </a>
              {' | '}
              Customer ordering:{' '}
              <a
                href="http://localhost:3001"
                className="text-theme-primary hover:text-theme-primary-hover hover:underline transition-colors"
              >
                Customer App
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}