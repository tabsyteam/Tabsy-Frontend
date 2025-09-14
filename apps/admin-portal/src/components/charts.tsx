'use client';

import React from 'react';

// Interactive User Growth Chart
function UserGrowthChart() {
  // Sample data for user growth
  const chartData = [
    { name: 'Jan', value: 1200 },
    { name: 'Feb', value: 1500 },
    { name: 'Mar', value: 1800 },
    { name: 'Apr', value: 1650 },
    { name: 'May', value: 2100 },
    { name: 'Jun', value: 2400 }
  ];

  const maxValue = Math.max(...chartData.map(item => item.value));
  const lastValue = chartData[chartData.length - 1]?.value || 0;
  const firstValue = chartData[0]?.value || 0;
  const totalGrowth = lastValue - firstValue;
  const growthPercentage = firstValue > 0 ? ((totalGrowth / firstValue) * 100).toFixed(1) : '0';

  return (
    <div className="w-full h-[300px] bg-theme-surface p-6 rounded-lg border border-theme-border shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-theme-text-primary mb-2">User Growth</h3>
        <div className="flex items-center space-x-4 text-sm">
          <div className="text-theme-text-secondary">
            Total: <span className="font-semibold text-theme-text-primary">{lastValue.toLocaleString()}</span>
          </div>
          <div className={`flex items-center ${totalGrowth >= 0 ? 'text-theme-success' : 'text-theme-error'}`}>
            <span className="mr-1">{totalGrowth >= 0 ? '↗' : '↘'}</span>
            <span className="font-semibold">{Math.abs(Number(growthPercentage))}%</span>
          </div>
        </div>
      </div>
      
      <div className="h-48 flex items-end justify-between space-x-3 bg-theme-background rounded-lg p-4">
        {chartData.map((item, index) => (
          <div key={index} className="flex flex-col items-center flex-1 group relative">
            <div
              className="w-full rounded-t-lg min-h-[8px] chart-theme-primary hover:bg-theme-primary-hover transition-all duration-200 cursor-pointer relative"
              style={{ height: `${(item.value / maxValue) * 140}px` }}
            >
              {/* Tooltip */}
              <div className="invisible group-hover:visible absolute -top-12 left-1/2 transform -translate-x-1/2 bg-theme-text-primary text-theme-surface text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                {item.name}: {item.value.toLocaleString()}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-theme-text-primary"></div>
              </div>
            </div>
            <div className="text-xs mt-2 text-theme-text-secondary font-medium">{item.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Interactive Order Growth Chart
function OrderGrowthChart() {
  // Sample data for order growth
  const chartData = [
    { name: 'Jan', value: 450 },
    { name: 'Feb', value: 520 },
    { name: 'Mar', value: 480 },
    { name: 'Apr', value: 610 },
    { name: 'May', value: 580 },
    { name: 'Jun', value: 670 }
  ];

  const maxValue = Math.max(...chartData.map(item => item.value));
  const lastValue = chartData[chartData.length - 1]?.value || 0;

  return (
    <div className="w-full h-[300px] bg-theme-surface p-6 rounded-lg border border-theme-border shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-theme-text-primary mb-2">Order Growth</h3>
        <div className="text-theme-text-secondary text-sm">
          Total: <span className="font-semibold text-theme-text-primary">{lastValue.toLocaleString()}</span>
        </div>
      </div>
      
      <div className="h-48 flex items-end justify-between space-x-3 bg-theme-background rounded-lg p-4">
        {chartData.map((item, index) => (
          <div key={index} className="flex flex-col items-center flex-1 group relative">
            <div
              className="w-full rounded-t-lg min-h-[8px] chart-theme-success hover:bg-theme-success-hover transition-all duration-200 cursor-pointer relative"
              style={{ height: `${(item.value / maxValue) * 140}px` }}
            >
              {/* Tooltip */}
              <div className="invisible group-hover:visible absolute -top-12 left-1/2 transform -translate-x-1/2 bg-theme-text-primary text-theme-surface text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                {item.name}: {item.value.toLocaleString()}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-theme-text-primary"></div>
              </div>
            </div>
            <div className="text-xs mt-2 text-theme-text-secondary font-medium">{item.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Interactive User Status Chart (Donut Chart)
function UserStatusChart() {
  // Sample data for user status - using theme colors
  const chartData = [
    { name: 'Active', value: 68, color: 'rgb(34 197 94)' }, // theme-success color
    { name: 'Pending', value: 22, color: 'rgb(245 158 11)' }, // theme-warning color
    { name: 'Suspended', value: 10, color: 'rgb(239 68 68)' } // theme-error color
  ];

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="w-full h-[200px] bg-theme-surface p-4 rounded-lg border border-theme-border shadow-sm">
      <div className="flex items-center justify-center h-full">
        <div className="relative">
          {/* Donut Chart using CSS */}
          <div className="w-32 h-32 rounded-full relative overflow-hidden shadow-lg bg-theme-background">
            {/* Create pie slices */}
            {chartData.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const cumulativePercentage = chartData.slice(0, index).reduce((sum, prev) => sum + (prev.value / total) * 100, 0);
              const rotation = (cumulativePercentage / 100) * 360;
              const sliceAngle = (percentage / 100) * 360;
              
              return (
                <div
                  key={index}
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(from ${rotation}deg, ${item.color} 0deg, ${item.color} ${sliceAngle}deg, transparent ${sliceAngle}deg)`,
                    clipPath: sliceAngle > 180 
                      ? 'none' 
                      : `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.cos((rotation + sliceAngle) * Math.PI / 180)}% ${50 + 50 * Math.sin((rotation + sliceAngle) * Math.PI / 180)}%)`
                  }}
                />
              );
            })}
            
            {/* Center circle for donut effect */}
            <div className="absolute inset-6 bg-theme-surface rounded-full shadow-inner flex items-center justify-center">
              <div className="text-center">
                <div className="text-lg font-bold text-theme-text-primary">{total}</div>
                <div className="text-xs text-theme-text-secondary">Users</div>
              </div>
            </div>
          </div>
          
          {/* Legend */}
          <div className="absolute left-36 top-0 space-y-2">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center group cursor-pointer">
                <div 
                  className="w-3 h-3 rounded-full mr-2 ring-2 ring-transparent group-hover:ring-theme-border transition-all duration-200"
                  style={{ backgroundColor: item.color }}
                />
                <div className="text-sm">
                  <div className="font-medium text-theme-text-primary">{item.name}</div>
                  <div className="text-xs text-theme-text-secondary">
                    {item.value} ({((item.value / total) * 100).toFixed(1)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export const DynamicUserGrowthChart = UserGrowthChart;
export const DynamicOrderGrowthChart = OrderGrowthChart;
export const DynamicUserStatusChart = UserStatusChart;
