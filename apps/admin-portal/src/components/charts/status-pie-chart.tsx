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
  // Sample data if none provided
  const chartData = data.length > 0 ? data : [
    { name: 'Active', value: 68, color: '#10b981' },
    { name: 'Inactive', value: 22, color: '#f59e0b' },
    { name: 'Pending', value: 10, color: '#ef4444' }
  ]

  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="w-full h-80 bg-white p-6 rounded-lg border shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600">Total: {total.toLocaleString()} users</p>
      </div>
      
      <div className="flex items-center justify-center h-48">
        <div className="relative">
          {/* Pie Chart using CSS */}
          <div className="w-32 h-32 rounded-full relative overflow-hidden shadow-lg">
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
            <div className="absolute inset-4 bg-white rounded-full shadow-inner flex items-center justify-center">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">{total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>
          </div>
          
          {/* Legend */}
          <div className="absolute left-40 top-0 space-y-2">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center group cursor-pointer">
                <div 
                  className="w-4 h-4 rounded-full mr-3 ring-2 ring-transparent group-hover:ring-gray-300 transition-all duration-200"
                  style={{ backgroundColor: item.color }}
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {item.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.value} ({((item.value / total) * 100).toFixed(1)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
