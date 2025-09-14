"use client";
import React from 'react';
import { z } from 'zod';
import { useAuth } from './AuthContext';
import { Button } from '../components/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/card';
import { LoadingSpinner } from '../components/LoadingComponents';
import { useErrorToast, useSuccessToast } from '../components/Toast';
import { Form, FormInput, FormControl } from '../components/Form';
import { UserRole } from '@tabsy/shared-types';

// Registration validation schema
const registrationSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s\-\'\.]+$/, 'First name can only contain letters, spaces, hyphens, apostrophes, and periods'),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s\-\'\.]+$/, 'Last name can only contain letters, spaces, hyphens, apostrophes, and periods'),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-\(\)\.]{10,}$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),
  role: z.enum(['CUSTOMER', 'RESTAURANT_OWNER', 'RESTAURANT_STAFF', 'ADMIN'] as const),
  termsAccepted: z
    .boolean()
    .refine(val => val === true, 'You must accept the terms and conditions'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface ValidatedRegistrationFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
  showLoginLink?: boolean;
  allowRoleSelection?: boolean;
  defaultRole?: UserRole;
}

export function ValidatedRegistrationForm({ 
  onSuccess, 
  redirectTo = '/', 
  showLoginLink = true,
  allowRoleSelection = false,
  defaultRole = UserRole.CUSTOMER
}: ValidatedRegistrationFormProps) {
  const { register, isLoading } = useAuth();
  const showError = useErrorToast();
  const showSuccess = useSuccessToast();

  const handleSubmit = async (data: RegistrationFormData) => {
    try {
      await register({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
        role: data.role as UserRole,
      });
      
      showSuccess('Registration successful! Welcome to Tabsy!');
      
      if (onSuccess) {
        onSuccess();
      } else if (typeof window !== 'undefined') {
        window.location.href = redirectTo;
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Registration failed');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
      </CardHeader>
      <CardContent>
        <Form
          schema={registrationSchema}
          onSubmit={handleSubmit}
          defaultValues={{
            email: '',
            password: '',
            confirmPassword: '',
            firstName: '',
            lastName: '',
            phone: '',
            role: defaultRole,
            termsAccepted: false,
          }}
        >
          {(form) => (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  form={form}
                  name="firstName"
                  label="First Name"
                  placeholder="Enter your first name"
                  required
                />
                
                <FormInput
                  form={form}
                  name="lastName"
                  label="Last Name"
                  placeholder="Enter your last name"
                  required
                />
              </div>
              
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
                name="phone"
                label="Phone Number"
                type="tel"
                placeholder="Enter your phone number (optional)"
                description="Optional: Used for order notifications"
              />
              
              <FormInput
                form={form}
                name="password"
                label="Password"
                type="password"
                placeholder="Create a strong password"
                required
                description="Must contain at least 8 characters with uppercase, lowercase, number, and special character"
              />
              
              <FormInput
                form={form}
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                placeholder="Confirm your password"
                required
              />
              
              {allowRoleSelection && (
                <FormControl
                  form={form}
                  name="role"
                  label="Account Type"
                  required
                >
                  {({ value, onChange }) => (
                    <select
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value={UserRole.CUSTOMER}>Customer</option>
                      <option value={UserRole.RESTAURANT_OWNER}>Restaurant Owner</option>
                      <option value={UserRole.RESTAURANT_STAFF}>Staff Member</option>
                    </select>
                  )}
                </FormControl>
              )}
              
              <FormControl
                form={form}
                name="termsAccepted"
                required
              >
                {({ value, onChange, error }) => (
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => onChange(e.target.checked)}
                        className="mt-1 rounded border-gray-300"
                        id="termsAccepted"
                      />
                      <label htmlFor="termsAccepted" className="text-sm">
                        I agree to the{' '}
                        <a href="/terms" className="text-primary hover:underline">
                          Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="/privacy" className="text-primary hover:underline">
                          Privacy Policy
                        </a>
                      </label>
                    </div>
                    {error && (
                      <p className="text-sm font-medium text-destructive">
                        {error}
                      </p>
                    )}
                  </div>
                )}
              </FormControl>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || form.formState.isSubmitting}
              >
                {isLoading || form.formState.isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
              
              {showLoginLink && (
                <div className="text-center text-sm">
                  Already have an account?{' '}
                  <a href="/login" className="text-primary hover:underline">
                    Sign in
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