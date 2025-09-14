"use client";
import React from 'react';
import { z } from 'zod';
import { useAuth } from './AuthContext';
import { Button } from '../components/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/card';
import { LoadingSpinner } from '../components/LoadingComponents';
import { useErrorToast, useSuccessToast } from '../components/Toast';
import { Form, FormInput } from '../components/Form';

// Validation schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface ValidatedLoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
  showRegisterLink?: boolean;
  showRememberMe?: boolean;
}

export function ValidatedLoginForm({ 
  onSuccess, 
  redirectTo = '/', 
  showRegisterLink = false,
  showRememberMe = false
}: ValidatedLoginFormProps) {
  const { login, isLoading } = useAuth();
  const showError = useErrorToast();
  const showSuccess = useSuccessToast();

  const handleSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      showSuccess('Login successful!');
      
      if (onSuccess) {
        onSuccess();
      } else if (typeof window !== 'undefined') {
        window.location.href = redirectTo;
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Login failed');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <Form
          schema={loginSchema}
          onSubmit={handleSubmit}
          defaultValues={{
            email: '',
            password: '',
            rememberMe: false,
          }}
        >
          {(form) => (
            <>
              <FormInput
                form={form}
                name="email"
                label="Email"
                type="email"
                placeholder="Enter your email"
                required
              />
              
              <FormInput
                form={form}
                name="password"
                label="Password"
                type="password"
                placeholder="Enter your password"
                required
              />
              
              {showRememberMe && (
                <div className="flex items-center space-x-2">
                  <input
                    {...form.register('rememberMe')}
                    type="checkbox"
                    id="rememberMe"
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="rememberMe" className="text-sm">
                    Remember me
                  </label>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || form.formState.isSubmitting}
              >
                {isLoading || form.formState.isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
              
              {showRegisterLink && (
                <div className="text-center text-sm">
                  Don't have an account?{' '}
                  <a href="/register" className="text-primary hover:underline">
                    Sign up
                  </a>
                </div>
              )}
            </>
          )}
        </Form>
      </CardContent>
    </Card>
  );
}