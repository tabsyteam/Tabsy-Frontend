"use client";
import React from 'react';
import { z } from 'zod';
import { Button } from '../components/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/card';
import { LoadingSpinner } from '../components/LoadingComponents';
import { useErrorToast, useSuccessToast } from '../components/Toast';
import { Form, FormInput, FormTextarea, FormControl } from '../components/Form';

// Order validation schema
const orderItemSchema = z.object({
  menuItemId: z.string().uuid('Invalid menu item ID'),
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(10, 'Maximum quantity is 10'),
  specialInstructions: z
    .string()
    .max(500, 'Special instructions cannot exceed 500 characters')
    .optional(),
  customizations: z.array(z.object({
    optionId: z.string().uuid('Invalid option ID'),
    valueId: z.string().uuid('Invalid value ID'),
  })).optional(),
});

const orderSchema = z.object({
  restaurantId: z.string().uuid('Invalid restaurant ID'),
  tableId: z.string().uuid('Invalid table ID').optional(),
  items: z
    .array(orderItemSchema)
    .min(1, 'Order must contain at least one item')
    .max(20, 'Cannot order more than 20 items at once'),
  specialInstructions: z
    .string()
    .max(1000, 'Special instructions cannot exceed 1000 characters')
    .optional(),
  guestInfo: z.object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name cannot exceed 50 characters')
      .optional(),
    email: z
      .string()
      .email('Please enter a valid email address')
      .optional(),
    phone: z
      .string()
      .regex(/^\+?[\d\s\-\(\)\.]{10,}$/, 'Please enter a valid phone number')
      .optional(),
  }).optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface ValidatedOrderFormProps {
  restaurantId: string;
  tableId?: string;
  initialItems?: Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    specialInstructions?: string;
  }>;
  onSubmit: (data: OrderFormData) => Promise<void>;
  isGuest?: boolean;
  loading?: boolean;
}

export function ValidatedOrderForm({
  restaurantId,
  tableId,
  initialItems = [],
  onSubmit,
  isGuest = false,
  loading = false
}: ValidatedOrderFormProps) {
  const showError = useErrorToast();
  const showSuccess = useSuccessToast();

  const handleSubmit = async (data: OrderFormData) => {
    try {
      await onSubmit(data);
      showSuccess('Order placed successfully!');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to place order');
    }
  };

  const defaultValues: Partial<OrderFormData> = {
    restaurantId,
    tableId,
    items: initialItems.map(item => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      specialInstructions: item.specialInstructions || '',
      customizations: [],
    })),
    specialInstructions: '',
    guestInfo: isGuest ? {
      name: '',
      email: '',
      phone: '',
    } : undefined,
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Confirm Your Order</CardTitle>
      </CardHeader>
      <CardContent>
        <Form
          schema={orderSchema}
          onSubmit={handleSubmit}
          defaultValues={defaultValues}
        >
          {(form) => (
            <>
              {/* Order Items Summary */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Order Items</h3>
                
                {initialItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-600">${item.price.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">Qty: {item.quantity}</p>
                        <p className="text-sm text-gray-600">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    
                    <FormInput
                      form={form}
                      name={`items.${index}.specialInstructions` as any}
                      label="Special Instructions (Optional)"
                      placeholder="Any special requests for this item..."
                    />
                  </div>
                ))}
              </div>

              {/* Order Special Instructions */}
              <FormTextarea
                form={form}
                name="specialInstructions"
                label="Special Instructions for Entire Order (Optional)"
                placeholder="Any special requests or dietary requirements..."
                description="Maximum 1000 characters"
              />

              {/* Guest Information */}
              {isGuest && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Contact Information</h3>
                  <p className="text-sm text-gray-600">
                    Optional: Provide your contact information for order updates
                  </p>
                  
                  <FormInput
                    form={form}
                    name="guestInfo.name"
                    label="Name"
                    placeholder="Your name"
                  />
                  
                  <FormInput
                    form={form}
                    name="guestInfo.email"
                    label="Email"
                    type="email"
                    placeholder="your.email@example.com"
                    description="For order confirmation and updates"
                  />
                  
                  <FormInput
                    form={form}
                    name="guestInfo.phone"
                    label="Phone Number"
                    type="tel"
                    placeholder="Your phone number"
                    description="For order status notifications"
                  />
                </div>
              )}

              {/* Order Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-medium">Total:</span>
                  <span className="text-xl font-bold">
                    ${initialItems.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}
                  </span>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || form.formState.isSubmitting}
                  size="lg"
                >
                  {loading || form.formState.isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Placing Order...
                    </>
                  ) : (
                    'Place Order'
                  )}
                </Button>
              </div>

              {/* Terms Notice */}
              <div className="text-xs text-gray-500 text-center">
                By placing this order, you agree to our{' '}
                <a href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </a>
              </div>
            </>
          )}
        </Form>
      </CardContent>
    </Card>
  );
}