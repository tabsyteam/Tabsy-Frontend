'use client'

import React from 'react'

interface StatusPieChartProps {
  data?: Array<{ name: string; value: number; color?: string }>
  title?: string
}

export const StatusPieChart: React.FC<StatusPieChartProps> = ({
  data = [],
  title = "Status Distribution"
}) => {
  const chartData = data || []
  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  // Show empty state if no data
  if (chartData.length === 0 || total === 0) {
    return (
      <div className="w-full h-80 bg-surface p-6 rounded-lg border shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-content-primary mb-2">{title}</h3>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="text-content-tertiary mb-2">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-sm text-content-secondary">No data available</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-80 bg-surface p-6 rounded-lg border shadow-sm relative" style={{ zIndex: 1 }}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-content-primary mb-2">{title}</h3>
        <p className="text-sm text-content-secondary">Total: {total.toLocaleString()} users</p>
      </div>
      
      <div className="flex items-center justify-between h-48 gap-8">
        <div className="flex-shrink-0 relative">
          {/* Pie Chart using CSS */}
          <div className="w-32 h-32 rounded-full relative overflow-hidden shadow-lg" style={{ isolation: 'isolate' }}>
            {chartData.reduce((acc, item, index) => {
              const percentage = (item.value / total) * 100
              const previousPercentage = acc.percentage
              const rotation = (previousPercentage / 100) * 360
              
              acc.elements.push(
                <div
                  key={index}
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(from ${rotation}deg, ${item.color} 0deg, ${item.color} ${(percentage / 100) * 360}deg, transparent ${(percentage / 100) * 360}deg)`,
                    clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.cos((rotation + (percentage / 100) * 360) * Math.PI / 180)}% ${50 + 50 * Math.sin((rotation + (percentage / 100) * 360) * Math.PI / 180)}%)`
                  }}
                />
              )
              
              acc.percentage += percentage
              return acc
            }, { elements: [] as React.ReactNode[], percentage: 0 }).elements}
            
            {/* Center circle for donut effect */}
            <div className="absolute inset-4 bg-surface rounded-full shadow-inner flex items-center justify-center">
              <div className="text-center">
                <div className="text-xl font-bold text-content-primary">{total}</div>
                <div className="text-xs text-content-secondary">Total</div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center group cursor-pointer">
              <div
                className="w-4 h-4 rounded-full mr-3 ring-2 ring-transparent group-hover:ring-border-secondary transition-all duration-200 flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <div>
                <div className="text-sm font-medium text-content-primary">
                  {item.name}
                </div>
                <div className="text-xs text-content-secondary">
                  {item.value} ({((item.value / total) * 100).toFixed(1)}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
