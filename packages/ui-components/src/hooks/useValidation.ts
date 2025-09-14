"use client";
import { useCallback } from 'react';
import { z } from 'zod';
import { useErrorToast } from '../components/Toast';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

export interface ValidationHookOptions {
  showErrorToast?: boolean;
  customErrorMessage?: string;
}

/**
 * Hook for validating data against Zod schemas
 */
export function useValidation() {
  const showError = useErrorToast();

  const validate = useCallback(<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    options: ValidationHookOptions = {}
  ): ValidationResult<T> => {
    const { showErrorToast = false, customErrorMessage } = options;

    try {
      const result = schema.parse(data);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map((issue: any) => issue.message);
        
        if (showErrorToast) {
          const message = customErrorMessage || errors[0] || 'Validation failed';
          showError(message);
        }
        
        return {
          success: false,
          errors,
        };
      }
      
      const errorMessage = 'Validation failed';
      if (showErrorToast) {
        showError(customErrorMessage || errorMessage);
      }
      
      return {
        success: false,
        errors: [errorMessage],
      };
    }
  }, [showError]);

  const validateAsync = useCallback(async <T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    options: ValidationHookOptions = {}
  ): Promise<ValidationResult<T>> => {
    const { showErrorToast = false, customErrorMessage } = options;

    try {
      const result = await schema.parseAsync(data);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map((issue: any) => issue.message);
        
        if (showErrorToast) {
          const message = customErrorMessage || errors[0] || 'Validation failed';
          showError(message);
        }
        
        return {
          success: false,
          errors,
        };
      }
      
      const errorMessage = 'Validation failed';
      if (showErrorToast) {
        showError(customErrorMessage || errorMessage);
      }
      
      return {
        success: false,
        errors: [errorMessage],
      };
    }
  }, [showError]);

  const safeValidate = useCallback(<T>(
    schema: z.ZodSchema<T>,
    data: unknown
  ) => {
    return schema.safeParse(data);
  }, []);

  return {
    validate,
    validateAsync,
    safeValidate,
  };
}

/**
 * Hook for validating API responses and sanitizing input
 */
export function useApiValidation() {
  const { validate } = useValidation();

  const validateApiResponse = useCallback(<T>(
    schema: z.ZodSchema<T>,
    response: unknown,
    endpoint?: string
  ): ValidationResult<T> => {
    const result = validate(schema, response);
    
    if (!result.success) {
      console.error(`API response validation failed${endpoint ? ` for ${endpoint}` : ''}:`, result.errors);
    }
    
    return result;
  }, [validate]);

  const sanitizeInput = useCallback(<T>(
    schema: z.ZodSchema<T>,
    input: unknown
  ): T | null => {
    const result = validate(schema, input);
    return result.success ? result.data! : null;
  }, [validate]);

  return {
    validateApiResponse,
    sanitizeInput,
  };
}

/**
 * Hook for real-time form field validation
 */
export function useFieldValidation<T>(schema: z.ZodSchema<T>) {
  const { safeValidate } = useValidation();

  const validateField = useCallback((value: unknown) => {
    const result = safeValidate(schema, value);
    
    if (result.success) {
      return {
        isValid: true,
        value: result.data,
        error: null,
      };
    } else {
      return {
        isValid: false,
        value: null,
        error: result.error.issues[0]?.message || 'Invalid value',
      };
    }
  }, [schema, safeValidate]);

  return { validateField };
}

/**
 * Hook for batch validation of multiple fields
 */
export function useBatchValidation() {
  const { validate } = useValidation();

  const validateBatch = useCallback(<T extends Record<string, any>>(
    schemas: { [K in keyof T]: z.ZodSchema<T[K]> },
    data: T
  ): {
    success: boolean;
    validatedData?: T;
    fieldErrors?: Partial<Record<keyof T, string>>;
  } => {
    const fieldErrors: Partial<Record<keyof T, string>> = {};
    const validatedData = {} as T;
    let hasErrors = false;

    for (const [field, schema] of Object.entries(schemas) as [keyof T, z.ZodSchema<any>][]) {
      const result = validate(schema, data[field]);
      
      if (result.success) {
        validatedData[field] = result.data;
      } else {
        hasErrors = true;
        fieldErrors[field] = result.errors?.[0] || 'Invalid value';
      }
    }

    return {
      success: !hasErrors,
      validatedData: hasErrors ? undefined : validatedData,
      fieldErrors: hasErrors ? fieldErrors : undefined,
    };
  }, [validate]);

  return { validateBatch };
}