import { ReactNode } from 'react'
import { Button } from '@tabsy/ui-components'
import { Plus, Search, Package, Utensils, AlertCircle } from 'lucide-react'

interface EmptyStateProps {
  type?: 'no-data' | 'no-results' | 'error' | 'categories' | 'items'
  title: string
  description: string
  searchQuery?: string
  actionLabel?: string
  onAction?: () => void
  icon?: ReactNode
  className?: string
}

const getDefaultIcon = (type: string) => {
  switch (type) {
    case 'categories':
      return <Package className="h-16 w-16 text-muted-foreground/40" />
    case 'items':
      return <Utensils className="h-16 w-16 text-muted-foreground/40" />
    case 'no-results':
      return <Search className="h-16 w-16 text-muted-foreground/40" />
    case 'error':
      return <AlertCircle className="h-16 w-16 text-destructive/40" />
    default:
      return <Package className="h-16 w-16 text-muted-foreground/40" />
  }
}

export function EmptyState({
  type = 'no-data',
  title,
  description,
  searchQuery,
  actionLabel,
  onAction,
  icon,
  className = ''
}: EmptyStateProps) {
  const displayIcon = icon || getDefaultIcon(type)

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-8 text-center ${className}`}>
      <div className="mb-6 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 rounded-full blur-xl"></div>
        <div className="relative bg-muted/20 p-8 rounded-full">
          {displayIcon}
        </div>
      </div>

      <div className="max-w-md space-y-3">
        <h3 className="text-xl font-semibold text-foreground">
          {title}
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          {searchQuery ? (
            <>
              {description.replace('{query}', `"${searchQuery}"`)}
            </>
          ) : (
            description
          )}
        </p>
      </div>

      {onAction && actionLabel && (
        <div className="mt-8">
          <Button
            onClick={onAction}
            className="btn-primary shadow-lg hover:shadow-xl transition-all duration-200"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            {actionLabel}
          </Button>
        </div>
      )}

      {type === 'no-results' && searchQuery && (
        <div className="mt-6 text-sm text-muted-foreground">
          <p>Try adjusting your search or filters to find what you're looking for.</p>
        </div>
      )}
    </div>
  )
}