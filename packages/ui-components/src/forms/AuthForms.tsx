"use client";
import React from 'react';
import { Form, FormInput } from '../components/Form';
import { Button } from '../components/button';
import { LoadingSpinner } from '../components/LoadingComponents';
import { loginSchema, registerSchema, type LoginFormData, type RegisterFormData } from '../validation/schemas';
import { UserRole } from '@tabsy/shared-types';

interface ValidatedLoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>;
  isLoading?: boolean;
  defaultValues?: Partial<LoginFormData>;
  className?: string;
}

export function ValidatedLoginForm({
  onSubmit,
  isLoading = false,
  defaultValues,
  className,
}: ValidatedLoginFormProps) {
  return (
    <Form
      schema={loginSchema}
      onSubmit={onSubmit}
      defaultValues={defaultValues}
      className={className}
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
            autoComplete="email"
          />
          
          <FormInput
            form={form}
            name="password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            required
            autoComplete="current-password"
          />
          
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </>
      )}
    </Form>
  );
}

interface ValidatedRegisterFormProps {
  onSubmit: (data: RegisterFormData) => Promise<void>;
  isLoading?: boolean;
  defaultValues?: Partial<RegisterFormData>;
  className?: string;
  showRoleSelect?: boolean;
  allowedRoles?: UserRole[];
}

export function ValidatedRegisterForm({
  onSubmit,
  isLoading = false,
  defaultValues,
  className,
  showRoleSelect = true,
  allowedRoles = [UserRole.CUSTOMER, UserRole.RESTAURANT_OWNER],
}: ValidatedRegisterFormProps) {
  return (
    <Form
      schema={registerSchema}
      onSubmit={onSubmit}
      defaultValues={defaultValues}
      className={className}
    >
      {(form) => (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              form={form}
              name="firstName"
              label="First Name"
              placeholder="Enter your first name"
              required
              autoComplete="given-name"
            />
            
            <FormInput
              form={form}
              name="lastName"
              label="Last Name"
              placeholder="Enter your last name"
              required
              autoComplete="family-name"
            />
          </div>
          
          <FormInput
            form={form}
            name="email"
            label="Email"
            type="email"
            placeholder="Enter your email"
            required
            autoComplete="email"
          />
          
          <FormInput
            form={form}
            name="password"
            label="Password"
            type="password"
            placeholder="Create a strong password"
            required
            autoComplete="new-password"
            description="Password must be at least 8 characters with uppercase, lowercase, and a number"
          />
          
          <FormInput
            form={form}
            name="phone"
            label="Phone Number"
            type="tel"
            placeholder="Enter your phone number (optional)"
            autoComplete="tel"
          />
          
          {showRoleSelect && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Type *</label>
              <select
                {...form.register('role')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
              >
                <option value="">Select account type</option>
                {allowedRoles.map((role) => (
                  <option key={role} value={role}>
                    {role === UserRole.CUSTOMER && 'Customer'}
                    {role === UserRole.RESTAURANT_OWNER && 'Restaurant Owner'}
                    {role === UserRole.RESTAURANT_STAFF && 'Staff Member'}
                    {role === UserRole.ADMIN && 'Administrator'}
                  </option>
                ))}
              </select>
              {form.formState.errors.role && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.role.message}
                </p>
              )}
            </div>
          )}
          
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </>
      )}
    </Form>
  );
}