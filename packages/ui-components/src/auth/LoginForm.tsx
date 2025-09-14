"use client";
import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Button } from '../components/button';
import { Input } from '../components/input';
import { LoadingSpinner } from '../components/LoadingComponents';
import { useErrorToast, useSuccessToast } from '../components/Toast';

interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
  showRegisterLink?: boolean;
}

export function LoginForm({ 
  onSuccess, 
  redirectTo = '/', 
  showRegisterLink = false 
}: LoginFormProps) {
  const { login, isLoading } = useAuth();
  const showError = useErrorToast();
  const showSuccess = useSuccessToast();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login(formData.email, formData.password);
      showSuccess('Welcome back! Login successful');
      
      if (onSuccess) {
        onSuccess();
      } else if (typeof window !== 'undefined') {
        window.location.href = redirectTo;
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Login failed. Please check your credentials.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email Field */}
      <div className="space-y-2">
        <label 
          htmlFor="email" 
          className={`text-sm font-semibold transition-colors ${
            focusedField === 'email' ? 'text-orange-600' : 'text-gray-900'
          }`}
        >
          Email Address
        </label>
        <div className="relative">
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            required
            disabled={isLoading}
            placeholder="restaurant@example.com"
            className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white ${
              focusedField === 'email' 
                ? 'border-orange-500 ring-2 ring-orange-100 shadow-md' 
                : 'border-gray-300 hover:border-gray-400 focus:border-orange-500'
            } ${isLoading ? 'bg-gray-50 text-gray-500' : ''}`}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Password Field */}
      <div className="space-y-2">
        <label 
          htmlFor="password" 
          className={`text-sm font-semibold transition-colors ${
            focusedField === 'password' ? 'text-orange-600' : 'text-gray-900'
          }`}
        >
          Password
        </label>
        <div className="relative">
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            required
            disabled={isLoading}
            placeholder="Enter your password"
            className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white ${
              focusedField === 'password' 
                ? 'border-orange-500 ring-2 ring-orange-100 shadow-md' 
                : 'border-gray-300 hover:border-gray-400 focus:border-orange-500'
            } ${isLoading ? 'bg-gray-50 text-gray-500' : ''}`}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Forgot Password Link */}
      <div className="flex justify-end">
        <button
          type="button"
          className="text-sm text-orange-600 hover:text-orange-700 hover:underline transition-colors font-medium"
        >
          Forgot password?
        </button>
      </div>
      
      {/* Submit Button */}
      <Button 
        type="submit" 
        disabled={isLoading || !formData.email || !formData.password}
        className={`w-full py-3 px-4 rounded-xl font-medium text-white transition-all duration-200 ${
          isLoading || !formData.email || !formData.password
            ? 'bg-gray-300 cursor-not-allowed' 
            : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <LoadingSpinner size="sm" className="mr-2" />
            <span>Signing you in...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <span>Sign In to Dashboard</span>
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
        )}
      </Button>
      
      {showRegisterLink && (
        <div className="text-center pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600 mb-2">New to Tabsy?</p>
          <a 
            href="/register" 
            className="inline-flex items-center text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
          >
            Create your restaurant account
            <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      )}
    </form>
  );
}