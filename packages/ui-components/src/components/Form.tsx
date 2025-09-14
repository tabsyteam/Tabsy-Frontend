"use client";
import React, { ReactNode } from 'react';
import { 
  useForm, 
  UseFormReturn, 
  FieldValues, 
  DefaultValues,
  SubmitHandler,
  Path,
  FieldPath
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '../lib/utils';

interface FormProps<TFieldValues extends FieldValues> {
  schema: z.ZodSchema<TFieldValues>;
  onSubmit: SubmitHandler<TFieldValues>;
  defaultValues?: DefaultValues<TFieldValues>;
  children: (form: UseFormReturn<TFieldValues>) => ReactNode;
  className?: string;
  id?: string;
}

export function Form<TFieldValues extends FieldValues = FieldValues>({
  schema,
  onSubmit,
  defaultValues,
  children,
  className,
  id,
}: FormProps<TFieldValues>) {
  const form = useForm<TFieldValues>({
    resolver: zodResolver(schema as any),
    defaultValues,
    mode: 'onBlur',
  });

  return (
    <form
      id={id}
      className={cn('space-y-4', className)}
      onSubmit={form.handleSubmit(onSubmit)}
    >
      {children(form)}
    </form>
  );
}

// Form field wrapper with error handling
interface FormFieldProps {
  children: ReactNode;
  error?: string;
  label?: string;
  htmlFor?: string;
  required?: boolean;
  description?: string;
  className?: string;
}

export function FormField({
  children,
  error,
  label,
  htmlFor,
  required,
  description,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label 
          htmlFor={htmlFor}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      {children}
      {description && (
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

// Generic form control component
interface FormControlProps<TFieldValues extends FieldValues> {
  form: UseFormReturn<TFieldValues>;
  name: Path<TFieldValues>;
  label?: string;
  description?: string;
  required?: boolean;
  children: (field: {
    value: any;
    onChange: (value: any) => void;
    onBlur: () => void;
    error?: string;
    disabled?: boolean;
  }) => ReactNode;
}

export function FormControl<TFieldValues extends FieldValues>({
  form,
  name,
  label,
  description,
  required,
  children,
}: FormControlProps<TFieldValues>) {
  const {
    register,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = form;

  const fieldError = errors[name]?.message as string | undefined;
  const fieldValue = watch(name);

  return (
    <FormField
      label={label}
      htmlFor={name}
      required={required}
      description={description}
      error={fieldError}
    >
      {children({
        value: fieldValue,
        onChange: (value) => setValue(name, value),
        onBlur: () => form.trigger(name),
        error: fieldError,
        disabled: isSubmitting,
      })}
    </FormField>
  );
}

// Input component integrated with React Hook Form
interface FormInputProps<TFieldValues extends FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'form'> {
  form: UseFormReturn<TFieldValues>;
  name: Path<TFieldValues>;
  label?: string;
  description?: string;
}

export function FormInput<TFieldValues extends FieldValues>({
  form,
  name,
  label,
  description,
  required,
  className,
  ...inputProps
}: FormInputProps<TFieldValues>) {
  const {
    register,
    formState: { errors, isSubmitting },
  } = form;

  const fieldError = errors[name]?.message as string | undefined;

  return (
    <FormField
      label={label}
      htmlFor={name}
      required={required}
      description={description}
      error={fieldError}
    >
      <input
        {...register(name)}
        {...inputProps}
        id={name}
        disabled={isSubmitting || inputProps.disabled}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          fieldError && 'border-destructive focus-visible:ring-destructive',
          className
        )}
      />
    </FormField>
  );
}

// Textarea component for React Hook Form
interface FormTextareaProps<TFieldValues extends FieldValues>
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'form'> {
  form: UseFormReturn<TFieldValues>;
  name: Path<TFieldValues>;
  label?: string;
  description?: string;
}

export function FormTextarea<TFieldValues extends FieldValues>({
  form,
  name,
  label,
  description,
  required,
  className,
  ...textareaProps
}: FormTextareaProps<TFieldValues>) {
  const {
    register,
    formState: { errors, isSubmitting },
  } = form;

  const fieldError = errors[name]?.message as string | undefined;

  return (
    <FormField
      label={label}
      htmlFor={name}
      required={required}
      description={description}
      error={fieldError}
    >
      <textarea
        {...register(name)}
        {...textareaProps}
        id={name}
        disabled={isSubmitting || textareaProps.disabled}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          fieldError && 'border-destructive focus-visible:ring-destructive',
          className
        )}
      />
    </FormField>
  );
}