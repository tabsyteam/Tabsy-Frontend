'use client';

import { useState, useEffect } from 'react';
import { Button } from '@tabsy/ui-components';
import {
  X,
  User,
  Mail,
  Phone,
  Lock,
  Shield,
  Building,
  Hash,
  AlertCircle
} from 'lucide-react';
import { useCreateUser, useUpdateUser, useRestaurants } from '@/hooks/api';
import { User as UserType, UserRole, CreateUserRequest, UpdateUserRequest } from '@tabsy/shared-types';
import { toast } from 'sonner';

interface AddUserModalProps {
  user?: UserType | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddUserModal({
  user,
  onClose,
  onSuccess
}: AddUserModalProps): JSX.Element {
  const isEditMode = !!user;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: UserRole.RESTAURANT_STAFF as UserRole
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const { data: restaurants } = useRestaurants();

  // Load existing user data in edit mode
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        password: '',
        confirmPassword: '',
        role: user.role
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const fieldValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setFormData(prev => ({
      ...prev,
      [name]: fieldValue
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Basic validation
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';

    // Email validation
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation for new users
    if (!isEditMode) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    // Role-specific validation
    // Restaurant association handled through separate API calls

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    try {
      const userData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role
      };

      // Restaurant association handled through RestaurantOwner/RestaurantStaff models

      if (isEditMode) {
        // Update existing user
        await updateUser.mutateAsync({
          id: user.id,
          data: userData as UpdateUserRequest
        });
      } else {
        // Create new user
        userData.password = formData.password;
        await createUser.mutateAsync(userData as CreateUserRequest);
      }

      onSuccess?.();
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-modal animate-fadeIn">
      <div className="bg-surface rounded-lg shadow-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-tertiary">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-light rounded-lg">
              <User className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-content-primary">
              {isEditMode ? 'Edit User' : 'Add New User'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-secondary rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-content-secondary" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-content-primary mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-primary" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-content-primary mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`input-professional w-full ${errors.firstName ? 'border-red-500' : ''}`}
                  placeholder="John"
                />
                {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-content-primary mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`input-professional w-full ${errors.lastName ? 'border-red-500' : ''}`}
                  placeholder="Doe"
                />
                {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-content-primary mb-2">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-content-tertiary" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`input-professional w-full pl-10 ${errors.email ? 'border-red-500' : ''}`}
                    placeholder="john.doe@example.com"
                    disabled={isEditMode}
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                {isEditMode && (
                  <p className="mt-1 text-xs text-content-tertiary">Email cannot be changed</p>
                )}
              </div>

            </div>
          </div>

          {/* Password (only for new users) */}
          {!isEditMode && (
            <div>
              <h3 className="text-lg font-medium text-content-primary mb-4 flex items-center">
                <Lock className="h-5 w-5 mr-2 text-primary" />
                Security
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-content-primary mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`input-professional w-full ${errors.password ? 'border-red-500' : ''}`}
                    placeholder="••••••••"
                  />
                  {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-content-primary mb-2">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`input-professional w-full ${errors.confirmPassword ? 'border-red-500' : ''}`}
                    placeholder="••••••••"
                  />
                  {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
                </div>
              </div>
              {formData.password && (
                <div className="mt-3 p-3 bg-primary-light/10 rounded-lg">
                  <p className="text-xs text-content-secondary flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Password must be at least 8 characters long
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Role & Permissions */}
          <div>
            <h3 className="text-lg font-medium text-content-primary mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-primary" />
              Role & Permissions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-content-primary mb-2">
                  User Role *
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="input-professional w-full"
                >
                  <option value={UserRole.CUSTOMER}>Customer</option>
                  <option value={UserRole.RESTAURANT_STAFF}>Restaurant Staff</option>
                  <option value={UserRole.RESTAURANT_OWNER}>Restaurant Owner</option>
                  <option value={UserRole.ADMIN}>Administrator</option>
                </select>
              </div>

            </div>

          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-border-tertiary">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createUser.isPending || updateUser.isPending}
              className="hover-lift"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createUser.isPending || updateUser.isPending}
              className="min-w-[120px] btn-professional hover-lift"
            >
              {(createUser.isPending || updateUser.isPending) ? (
                <div className="flex items-center">
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </div>
              ) : (
                isEditMode ? 'Update User' : 'Create User'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}