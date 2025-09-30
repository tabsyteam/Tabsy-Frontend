import { PullToRefreshIndicatorProps } from '@/hooks/usePullToRefresh'

export function PullToRefreshIndicator({
  isPulling,
  isRefreshing,
  pullDistance,
  canRefresh,
  progress
}: PullToRefreshIndicatorProps) {
  if (!isPulling && !isRefreshing) return null

  return (
    <div
      className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 ease-out bg-surface/90 backdrop-blur-sm"
      style={{
        height: `${Math.min(pullDistance, 80)}px`,
        transform: `translateY(${isPulling ? 0 : -100}%)`,
        opacity: isPulling || isRefreshing ? 1 : 0
      }}
    >
      <div className="flex flex-col items-center space-y-2 py-2">
        {isRefreshing ? (
          <>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="text-xs text-content-secondary">Refreshing...</span>
          </>
        ) : (
          <>
            <div
              className={`rounded-full h-6 w-6 border-2 transition-all duration-200 ${
                canRefresh
                  ? 'border-primary bg-primary animate-pulse'
                  : 'border-default'
              }`}
              style={{
                transform: `rotate(${progress * 180}deg)`
              }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <div
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    canRefresh ? 'bg-surface' : 'bg-content-tertiary'
                  }`}
                />
              </div>
            </div>
            <span className="text-xs text-content-secondary">
              {canRefresh ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </>
        )}
      </div>
    </div>
  )
}