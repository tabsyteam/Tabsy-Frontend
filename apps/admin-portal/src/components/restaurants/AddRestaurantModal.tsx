'use client';

import { useState, useEffect } from 'react';
import { Button } from '@tabsy/ui-components';
import {
  X,
  Store,
  MapPin,
  Phone,
  Mail,
  Globe
} from 'lucide-react';
import { useCreateRestaurant, useUpdateRestaurant } from '@/hooks/api';
import { Restaurant, CreateRestaurantRequest, UpdateRestaurantRequest } from '@tabsy/shared-types';
import { toast } from 'sonner';

interface AddRestaurantModalProps {
  restaurant?: Restaurant | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddRestaurantModal({
  restaurant,
  onClose,
  onSuccess
}: AddRestaurantModalProps): JSX.Element {
  const isEditMode = !!restaurant;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createRestaurant = useCreateRestaurant();
  const updateRestaurant = useUpdateRestaurant();

  // Load existing restaurant data in edit mode
  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || '',
        description: restaurant.description || '',
        email: restaurant.email || '',
        phone: restaurant.phoneNumber || '',
        website: restaurant.website || '',
        address: restaurant.address || '',
        city: restaurant.city || '',
        state: restaurant.state || '',
        zipCode: restaurant.zipCode || '',
        country: restaurant.country || 'USA'
      });
    }
  }, [restaurant]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
    if (!formData.name.trim()) newErrors.name = 'Restaurant name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.zipCode.trim()) newErrors.zipCode = 'Zip code is required';

    // Email validation
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Website URL validation
    if (formData.website && !formData.website.match(/^https?:\/\/.+/)) {
      newErrors.website = 'Please enter a valid URL starting with http:// or https://';
    }

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
      if (isEditMode) {
        // Update uses flat structure
        const updateData: UpdateRestaurantRequest = {
          name: formData.name,
          description: formData.description,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country,
          phoneNumber: formData.phone,
          email: formData.email,
          website: formData.website || undefined,
          active: true
        };

        await updateRestaurant.mutateAsync({
          id: restaurant.id,
          data: updateData
        });
      } else {
        // Create uses flat structure (matching backend validator)
        const createData: CreateRestaurantRequest = {
          name: formData.name,
          description: formData.description,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country,
          phoneNumber: formData.phone,
          email: formData.email,
          website: formData.website || undefined,
          active: true
          // Note: cuisine, priceRange, and openingHours are not accepted by backend validator
        };

        await createRestaurant.mutateAsync(createData);
      }

      onSuccess?.();
    } catch (error) {
      console.error('Failed to save restaurant:', error);
      // Error toast is handled by the mutation hook
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-modal animate-fadeIn">
      <div className="bg-surface rounded-lg shadow-modal w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-tertiary">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-light rounded-lg">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-content-primary">
              {isEditMode ? 'Edit Restaurant' : 'Add New Restaurant'}
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
          {/* Restaurant Information */}
          <div>
            <h3 className="text-lg font-medium text-content-primary mb-4 flex items-center">
              <Store className="h-5 w-5 mr-2 text-primary" />
              Restaurant Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-content-primary mb-2">
                  Restaurant Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`input-professional w-full ${errors.name ? 'border-status-error' : ''}`}
                  placeholder="Enter restaurant name"
                />
                {errors.name && <p className="mt-1 text-sm text-status-error">{errors.name}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-content-primary mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="input-professional w-full"
                  placeholder="Describe the restaurant, its specialties, atmosphere, etc."
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-medium text-content-primary mb-4 flex items-center">
              <Phone className="h-5 w-5 mr-2 text-primary" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className={`input-professional w-full pl-10 ${errors.email ? 'border-status-error' : ''}`}
                    placeholder="restaurant@example.com"
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-status-error">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-content-primary mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-content-tertiary" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`input-professional w-full pl-10 ${errors.phone ? 'border-status-error' : ''}`}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                {errors.phone && <p className="mt-1 text-sm text-status-error">{errors.phone}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-content-primary mb-2">
                  Website
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-content-tertiary" />
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    className={`input-professional w-full pl-10 ${errors.website ? 'border-status-error' : ''}`}
                    placeholder="https://www.restaurant.com"
                  />
                </div>
                {errors.website && <p className="mt-1 text-sm text-status-error">{errors.website}</p>}
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <h3 className="text-lg font-medium text-content-primary mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-primary" />
              Location
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-content-primary mb-2">
                  Street Address *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className={`input-professional w-full ${errors.address ? 'border-status-error' : ''}`}
                  placeholder="123 Main Street"
                />
                {errors.address && <p className="mt-1 text-sm text-status-error">{errors.address}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-content-primary mb-2">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className={`input-professional w-full ${errors.city ? 'border-status-error' : ''}`}
                  placeholder="San Francisco"
                />
                {errors.city && <p className="mt-1 text-sm text-status-error">{errors.city}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-content-primary mb-2">
                  State *
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className={`input-professional w-full ${errors.state ? 'border-status-error' : ''}`}
                  placeholder="CA"
                />
                {errors.state && <p className="mt-1 text-sm text-status-error">{errors.state}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-content-primary mb-2">
                  Zip Code *
                </label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  className={`input-professional w-full ${errors.zipCode ? 'border-status-error' : ''}`}
                  placeholder="94102"
                />
                {errors.zipCode && <p className="mt-1 text-sm text-status-error">{errors.zipCode}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-content-primary mb-2">
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="input-professional w-full"
                  placeholder="USA"
                />
              </div>
            </div>
          </div>


          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-border-tertiary">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createRestaurant.isPending || updateRestaurant.isPending}
              className="hover-lift"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createRestaurant.isPending || updateRestaurant.isPending}
              className="min-w-[120px] btn-professional hover-lift"
            >
              {(createRestaurant.isPending || updateRestaurant.isPending) ? (
                <div className="flex items-center">
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-content-inverse border-t-transparent rounded-full"></div>
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </div>
              ) : (
                isEditMode ? 'Update Restaurant' : 'Create Restaurant'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}