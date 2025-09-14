"use client";
import React from 'react';
import { Form, FormInput, FormTextarea } from '../components/Form';
import { Button } from '../components/button';
import { LoadingSpinner } from '../components/LoadingComponents';
import { 
  orderSchema, 
  paymentSchema, 
  contactSchema,
  type OrderFormData, 
  type PaymentFormData,
  type ContactFormData 
} from '../validation/schemas';
import { sanitizeFormData } from '../validation/sanitization';
import { useValidation } from '../hooks/useValidation';

// Order Form with Comprehensive Validation
interface ValidatedOrderFormProps {
  onSubmit: (data: OrderFormData) => Promise<void>;
  isLoading?: boolean;
  defaultValues?: Partial<OrderFormData>;
  className?: string;
}

export function ValidatedOrderForm({
  onSubmit,
  isLoading = false,
  defaultValues,
  className,
}: ValidatedOrderFormProps) {
  const { validate } = useValidation();

  const handleSubmit = async (data: OrderFormData) => {
    // Validate directly with Zod schema - it handles the sanitization
    const validation = validate(orderSchema, data, {
      showErrorToast: true,
      customErrorMessage: 'Please check your order details and try again',
    });

    if (validation.success && validation.data) {
      await onSubmit(validation.data);
    }
  };

  return (
    <Form
      schema={orderSchema}
      onSubmit={handleSubmit}
      defaultValues={defaultValues}
      className={className}
    >
      {(form) => (
        <>
          <FormInput
            form={form}
            name="restaurantId"
            label="Restaurant"
            placeholder="Select restaurant"
            required
            description="Restaurant where you want to place the order"
          />
          
          <FormInput
            form={form}
            name="tableId"
            label="Table Number"
            placeholder="Enter table number"
            required
            description="Your table number for dine-in orders"
          />
          
          <FormTextarea
            form={form}
            name="customerNotes"
            label="Special Instructions"
            placeholder="Any special requests or dietary requirements..."
            description="Let us know about allergies or special preparation requests"
            rows={3}
          />
          
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Placing Order...
              </>
            ) : (
              'Place Order'
            )}
          </Button>
        </>
      )}
    </Form>
  );
}

// Payment Form with Security Validation
interface ValidatedPaymentFormProps {
  onSubmit: (data: PaymentFormData) => Promise<void>;
  isLoading?: boolean;
  defaultValues?: Partial<PaymentFormData>;
  className?: string;
}

export function ValidatedPaymentForm({
  onSubmit,
  isLoading = false,
  defaultValues,
  className,
}: ValidatedPaymentFormProps) {
  const { validate } = useValidation();

  const handleSubmit = async (data: PaymentFormData) => {
    // Validate payment data with enhanced security
    const validation = validate(paymentSchema, data, {
      showErrorToast: true,
      customErrorMessage: 'Payment information is invalid. Please check your details.',
    });

    if (validation.success && validation.data) {
      await onSubmit(validation.data);
    }
  };

  return (
    <Form
      schema={paymentSchema}
      onSubmit={handleSubmit}
      defaultValues={defaultValues}
      className={className}
    >
      {(form) => (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              form={form}
              name="amount"
              label="Order Amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              required
              description="Total order amount"
            />
            
            <FormInput
              form={form}
              name="tip"
              label="Tip Amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              description="Optional tip for service"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Method *</label>
            <select
              {...form.register('paymentMethod')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
            >
              <option value="">Select payment method</option>
              <option value="card">Credit/Debit Card</option>
              <option value="cash">Cash</option>
              <option value="digital_wallet">Digital Wallet</option>
            </select>
            {form.formState.errors.paymentMethod && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.paymentMethod.message}
              </p>
            )}
          </div>
          
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Processing Payment...
              </>
            ) : (
              'Process Payment'
            )}
          </Button>
        </>
      )}
    </Form>
  );
}

// Contact Form with Input Sanitization
interface ValidatedContactFormProps {
  onSubmit: (data: ContactFormData) => Promise<void>;
  isLoading?: boolean;
  defaultValues?: Partial<ContactFormData>;
  className?: string;
}

export function ValidatedContactForm({
  onSubmit,
  isLoading = false,
  defaultValues,
  className,
}: ValidatedContactFormProps) {
  const { validate } = useValidation();

  const handleSubmit = async (data: ContactFormData) => {
    // Comprehensive sanitization for user-generated content
    const sanitizedData = sanitizeFormData(data, {
      name: 'name',
      email: 'email',
      phone: 'phone',
      subject: 'text',
      message: 'text',
    });

    // Validate with detailed error reporting
    const validation = validate(contactSchema, sanitizedData, {
      showErrorToast: true,
      customErrorMessage: 'Please check your contact information and try again',
    });

    if (validation.success && validation.data) {
      await onSubmit(validation.data);
    }
  };

  return (
    <Form
      schema={contactSchema}
      onSubmit={handleSubmit}
      defaultValues={defaultValues}
      className={className}
    >
      {(form) => (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              form={form}
              name="name"
              label="Full Name"
              placeholder="Enter your full name"
              required
              autoComplete="name"
            />
            
            <FormInput
              form={form}
              name="email"
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              required
              autoComplete="email"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              form={form}
              name="phone"
              label="Phone Number"
              type="tel"
              placeholder="Enter your phone number (optional)"
              autoComplete="tel"
            />
            
            <FormInput
              form={form}
              name="subject"
              label="Subject"
              placeholder="What is this regarding?"
              required
            />
          </div>
          
          <FormTextarea
            form={form}
            name="message"
            label="Message"
            placeholder="Please describe your inquiry or feedback..."
            required
            rows={5}
            description="Please provide as much detail as possible"
          />
          
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Sending Message...
              </>
            ) : (
              'Send Message'
            )}
          </Button>
        </>
      )}
    </Form>
  );
}

// Example usage component demonstrating validation in action
export function ValidationExampleShowcase() {
  const handleOrderSubmit = async (data: OrderFormData) => {
    console.log('Order submitted:', data);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
  };

  const handlePaymentSubmit = async (data: PaymentFormData) => {
    console.log('Payment processed:', data);
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
  };

  const handleContactSubmit = async (data: ContactFormData) => {
    console.log('Contact form submitted:', data);
    // Simulate message sending
    await new Promise(resolve => setTimeout(resolve, 2000));
  };

  return (
    <div className="space-y-8 p-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Validation System Demo</h2>
        <p className="text-gray-600">
          This showcase demonstrates comprehensive form validation with Zod schemas, 
          input sanitization, error handling, and user-friendly feedback.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Order Form</h3>
          <ValidatedOrderForm onSubmit={handleOrderSubmit} />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Payment Form</h3>
          <ValidatedPaymentForm onSubmit={handlePaymentSubmit} />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Contact Form</h3>
          <ValidatedContactForm onSubmit={handleContactSubmit} />
        </div>
      </div>
    </div>
  );
}