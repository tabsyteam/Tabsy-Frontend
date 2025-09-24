'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { ChefHat } from 'lucide-react';
import { LoginForm, useAuth } from '@tabsy/ui-components';
import { UserRole, User } from '@tabsy/shared-types';

function RestaurantLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user, isLoading, isVerifying } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Get error message from URL params
  const errorType = searchParams.get('error');
  const getErrorMessage = () => {
    switch (errorType) {
      case 'unauthorized_role':
        return 'Your account role is not authorized for the restaurant dashboard. Please contact your administrator.';
      case 'session_expired':
        return 'Your session has expired. Please sign in again.';
      default:
        return null;
    }
  };

  // Debug logs
  useEffect(() => {
    console.log('Auth State:', { isAuthenticated, user: (user as User)?.role, isLoading, isVerifying });
  }, [isAuthenticated, user, isLoading, isVerifying]);

  // Set a timeout for loading state to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        console.warn('Auth loading timeout reached, forcing load completion');
        setLoadingTimeout(true);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timer);
  }, [isLoading]);

  // Reset timeout when loading changes
  useEffect(() => {
    if (!isLoading) {
      setLoadingTimeout(false);
    }
  }, [isLoading]);

  // Redirect if already authenticated - WAIT for complete profile
  useEffect(() => {
    if (isAuthenticated && user && 'role' in user && !isVerifying && !isLoading) {
      const typedUser = user as User;
      console.log('User authenticated with complete profile, redirecting...', typedUser.role);
      // Check if user has restaurant access
      const userRole = typedUser.role;
      if (userRole === UserRole.RESTAURANT_OWNER || userRole === UserRole.RESTAURANT_STAFF) {
        router.push('/dashboard');
      } else if (userRole === UserRole.ADMIN) {
        router.push('/admin/dashboard');
      } else {
        // Not a restaurant or admin user, redirect to customer app
        console.log('Invalid role for restaurant dashboard:', userRole);
        window.location.href = 'http://localhost:3001';
      }
    }
  }, [isAuthenticated, user, router, isVerifying, isLoading]);

  const handleLoginSuccess = () => {
    // The redirect logic is handled above in useEffect
    // This is just a fallback
    router.push('/dashboard');
  };

  // Show loading while checking authentication (with timeout fallback)
  if ((isLoading || isVerifying) && !loadingTimeout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full"></div>
          <p className="text-muted-foreground">
            {isVerifying ? 'Verifying credentials...' : 'Loading...'}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {isVerifying ? 'Fetching complete profile...' : 'Initializing authentication...'}
          </p>
        </div>
      </div>
    );
  }

  // Show warning if loading timed out
  if (loadingTimeout) {
    console.warn('Authentication loading timed out, showing login form');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/30 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-40 h-40 bg-secondary/30 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-36 h-36 bg-accent/30 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-lg">
          {/* Main Card */}
          <div className="bg-card backdrop-blur-xl rounded-3xl shadow-2xl border border-border overflow-hidden">
            {/* Header Section */}
            <div className="px-8 pt-12 pb-8 text-center bg-gradient-to-br from-primary to-accent relative">
              <div className="absolute inset-0 bg-pattern opacity-10"></div>
              <div className="relative z-10">
                <div className="mx-auto w-20 h-20 bg-primary-foreground/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <ChefHat className="w-10 h-10 text-primary-foreground" />
                </div>
                <h1 className="text-3xl font-bold text-primary-foreground mb-2">Welcome Back</h1>
                <p className="text-primary-foreground/90 text-sm leading-relaxed">
                  Sign in to your restaurant dashboard<br />and manage your operations
                </p>
              </div>
            </div>

            {/* Form Section */}
            <div className="px-8 py-8 bg-card">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-2">Restaurant Login</h2>
                <p className="text-muted-foreground text-sm">Enter your credentials to access your dashboard</p>
              </div>
              
              <LoginForm 
                onSuccess={handleLoginSuccess}
                redirectTo="/dashboard"
                showRegisterLink={false}
              />
            </div>

            {/* Footer Section */}
            <div className="px-8 pb-8 space-y-6">
              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-card text-muted-foreground">or</span>
                </div>
              </div>

              {/* Register CTA */}
              <div className="text-center p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-primary">
                <p className="text-sm text-muted-foreground mb-2">New to Tabsy?</p>
                <button
                  onClick={() => router.push('/register')}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary bg-card hover:bg-bg-primary/10 border border-primary rounded-lg transition-all duration-200 hover:shadow-md hover:scale-105"
                >
                  Register your restaurant
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </div>

              {/* Help Links */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <a
                    href="mailto:support@tabsy.com"
                    className="flex items-center space-x-1 hover:text-primary transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Support</span>
                  </a>
                  <span className="text-theme-border-dark">•</span>
                  <a
                    href="http://localhost:3001"
                    className="flex items-center space-x-1 hover:text-primary transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <span>Customer App</span>
                  </a>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  © 2025 Tabsy
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RestaurantLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <RestaurantLoginContent />
    </Suspense>
  );
}