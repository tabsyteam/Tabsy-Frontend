'use client'

import React from 'react'

interface GrowthChartProps {
  data?: Array<{ name: string; value: number }>
  title?: string
  color?: string
}

export const GrowthChart: React.FC<GrowthChartProps> = ({
  data = [],
  title = "Growth Chart",
  color = "blue"
}) => {
  const chartData = data || []

  // Show empty state if no data
  if (chartData.length === 0) {
    return (
      <div className="w-full h-80 bg-surface p-6 rounded-lg border shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-content-primary mb-2">{title}</h3>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="text-content-tertiary mb-2">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <p className="text-sm text-content-secondary">No growth data available</p>
          </div>
        </div>
      </div>
    )
  }

  const maxValue = Math.max(...chartData.map(item => item.value))
  
  // Safe calculations with null checks
  const firstValue = chartData[0]?.value || 0
  const lastValue = chartData[chartData.length - 1]?.value || 0
  const totalGrowth = lastValue - firstValue
  const growthPercentage = firstValue > 0 ? ((totalGrowth / firstValue) * 100).toFixed(1) : '0'

  const colorClasses = {
    blue: 'bg-status-info hover:bg-status-info-dark',
    green: 'bg-status-success hover:bg-status-success-dark',
    purple: 'bg-primary hover:bg-primary-dark',
    red: 'bg-status-error hover:bg-status-error-dark'
  }

  return (
    <div className="w-full h-80 bg-surface p-6 rounded-lg border shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-content-primary mb-2">{title}</h3>
        <div className="flex items-center space-x-4 text-sm">
          <div className="text-content-secondary">
            Total: <span className="font-semibold text-content-primary">{lastValue.toLocaleString()}</span>
          </div>
          <div className={`flex items-center ${totalGrowth >= 0 ? 'text-status-success' : 'text-status-error'}`}>
            <span className="mr-1">{totalGrowth >= 0 ? '↗' : '↘'}</span>
            <span className="font-semibold">{Math.abs(Number(growthPercentage))}%</span>
          </div>
        </div>
      </div>
      
      <div className="h-48 flex items-end justify-between space-x-3 bg-surface-secondary rounded-lg p-4">
        {chartData.map((item, index) => (
          <div key={index} className="flex flex-col items-center flex-1 group relative">
            <div
              className={`w-full rounded-t-lg min-h-[8px] transition-all duration-200 cursor-pointer ${colorClasses[color as keyof typeof colorClasses]} relative`}
              style={{ height: `${(item.value / maxValue) * 140}px` }}
            >
              {/* Tooltip */}
              <div className="invisible group-hover:visible absolute -top-12 left-1/2 transform -translate-x-1/2 bg-content-primary text-content-inverse text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                {item.name}: {item.value.toLocaleString()}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-content-primary"></div>
              </div>
            </div>
            <div className="text-xs mt-2 text-content-secondary font-medium">{item.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
