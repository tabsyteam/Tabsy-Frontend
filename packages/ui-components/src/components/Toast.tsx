'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

export interface Toast {
  id: string
  title?: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearToasts: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: React.ReactNode
  defaultDuration?: number
}

export function ToastProvider({ children, defaultDuration = 5000 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? defaultDuration
    }

    setToasts(prev => [...prev, newToast])

    // Auto-remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }

    return id
  }, [defaultDuration])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onClose: () => void
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const typeStyles = {
    success: 'bg-status-success-light border-status-success-border text-status-success-dark',
    error: 'bg-status-error-light border-status-error-border text-status-error-dark',
    warning: 'bg-status-warning-light border-status-warning-border text-status-warning-dark',
    info: 'bg-status-info-light border-status-info-border text-status-info-dark'
  }

  const iconMap = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }

  return (
    <div className={`p-4 border rounded-lg shadow-lg transition-all duration-300 ${typeStyles[toast.type]}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3 mt-0.5">
          <span className="text-lg">{iconMap[toast.type]}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          {toast.title && (
            <h4 className="font-medium text-sm mb-1">{toast.title}</h4>
          )}
          <p className="text-sm">{toast.message}</p>
          
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-sm font-medium underline hover:no-underline"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        
        <button
          onClick={onClose}
          className="flex-shrink-0 ml-3 text-content-disabled hover:text-content-secondary"
        >
          <span className="sr-only">Close</span>
          <span className="text-lg">×</span>
        </button>
      </div>
    </div>
  )
}

// Convenience hooks for different toast types
export function useErrorToast() {
  const { addToast } = useToast()
  
  return useCallback((message: string, options?: { title?: string; action?: Toast['action'] }) => {
    return addToast({
      type: 'error',
      message,
      title: options?.title,
      action: options?.action,
      duration: 8000 // Longer for errors
    })
  }, [addToast])
}

export function useSuccessToast() {
  const { addToast } = useToast()
  
  return useCallback((message: string, options?: { title?: string; action?: Toast['action'] }) => {
    return addToast({
      type: 'success',
      message,
      title: options?.title,
      action: options?.action
    })
  }, [addToast])
}

export function useWarningToast() {
  const { addToast } = useToast()
  
  return useCallback((message: string, options?: { title?: string; action?: Toast['action'] }) => {
    return addToast({
      type: 'warning',
      message,
      title: options?.title,
      action: options?.action
    })
  }, [addToast])
}

export function useInfoToast() {
  const { addToast } = useToast()
  
  return useCallback((message: string, options?: { title?: string; action?: Toast['action'] }) => {
    return addToast({
      type: 'info',
      message,
      title: options?.title,
      action: options?.action
    })
  }, [addToast])
}

// Export Toaster as an alias for ToastProvider for easier import
export { ToastProvider as Toaster }
// Export standalone container for flexible usage
export { ToastContainer }