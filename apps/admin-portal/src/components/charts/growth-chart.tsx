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
  // Sample data if none provided
  const chartData = data.length > 0 ? data : [
    { name: 'Jan', value: 1200 },
    { name: 'Feb', value: 1500 },
    { name: 'Mar', value: 1800 },
    { name: 'Apr', value: 1650 },
    { name: 'May', value: 2100 },
    { name: 'Jun', value: 2400 }
  ]

  const maxValue = Math.max(...chartData.map(item => item.value))
  
  // Safe calculations with null checks
  const firstValue = chartData[0]?.value || 0
  const lastValue = chartData[chartData.length - 1]?.value || 0
  const totalGrowth = lastValue - firstValue
  const growthPercentage = firstValue > 0 ? ((totalGrowth / firstValue) * 100).toFixed(1) : '0'

  const colorClasses = {
    blue: 'bg-blue-500 hover:bg-blue-600',
    green: 'bg-green-500 hover:bg-green-600',
    purple: 'bg-purple-500 hover:bg-purple-600',
    red: 'bg-red-500 hover:bg-red-600'
  }

  return (
    <div className="w-full h-80 bg-white p-6 rounded-lg border shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <div className="flex items-center space-x-4 text-sm">
          <div className="text-gray-600">
            Total: <span className="font-semibold text-gray-900">{lastValue.toLocaleString()}</span>
          </div>
          <div className={`flex items-center ${totalGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <span className="mr-1">{totalGrowth >= 0 ? '↗' : '↘'}</span>
            <span className="font-semibold">{Math.abs(Number(growthPercentage))}%</span>
          </div>
        </div>
      </div>
      
      <div className="h-48 flex items-end justify-between space-x-3 bg-gray-50 rounded-lg p-4">
        {chartData.map((item, index) => (
          <div key={index} className="flex flex-col items-center flex-1 group relative">
            <div
              className={`w-full rounded-t-lg min-h-[8px] transition-all duration-200 cursor-pointer ${colorClasses[color as keyof typeof colorClasses]} relative`}
              style={{ height: `${(item.value / maxValue) * 140}px` }}
            >
              {/* Tooltip */}
              <div className="invisible group-hover:visible absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                {item.name}: {item.value.toLocaleString()}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
              </div>
            </div>
            <div className="text-xs mt-2 text-gray-600 font-medium">{item.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
