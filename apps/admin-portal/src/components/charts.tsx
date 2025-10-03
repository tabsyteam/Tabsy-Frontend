'use client';

import React from 'react';

// Interactive User Growth Chart
interface GrowthChartProps {
  data?: Array<{ date: string; count: number }>;
}

function UserGrowthChart({ data }: GrowthChartProps = {}) {
  // Transform API data to chart format
  const chartData = data && data.length > 0
    ? data.map(item => ({
        name: new Date(item.date).toLocaleDateString('en-US', { month: 'short' }),
        value: item.count
      }))
    : []; // Empty array if no data

  // Handle empty state
  if (!chartData || chartData.length === 0) {
    return (
      <div className="w-full h-[300px] bg-surface p-6 rounded-lg border border-border-tertiary shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-content-primary mb-2">User Growth</h3>
        </div>
        <div className="h-48 flex items-center justify-center bg-surface-secondary rounded-lg">
          <div className="text-center text-content-tertiary">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">No user growth data available</p>
          </div>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...chartData.map(item => item.value), 1);
  const lastValue = chartData[chartData.length - 1]?.value || 0;
  const firstValue = chartData[0]?.value || 0;
  const totalGrowth = lastValue - firstValue;
  const growthPercentage = firstValue > 0 ? ((totalGrowth / firstValue) * 100).toFixed(1) : '0';

  return (
    <div className="w-full h-[300px] bg-surface p-6 rounded-lg border border-border-tertiary shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-content-primary mb-2">User Growth</h3>
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
              className="w-full rounded-t-lg min-h-[8px] bg-primary hover:bg-primary-hover transition-all duration-200 cursor-pointer relative"
              style={{ height: `${(item.value / maxValue) * 140}px` }}
            >
              {/* Tooltip */}
              <div className="invisible group-hover:visible absolute -top-12 left-1/2 transform -translate-x-1/2 bg-content-primary text-primary-foreground text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                {item.name}: {item.value.toLocaleString()}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-content-primary"></div>
              </div>
            </div>
            <div className="text-xs mt-2 text-content-secondary font-medium">{item.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Interactive Order Growth Chart
function OrderGrowthChart({ data }: GrowthChartProps = {}) {
  // Transform API data to chart format
  const chartData = data && data.length > 0
    ? data.map(item => ({
        name: new Date(item.date).toLocaleDateString('en-US', { month: 'short' }),
        value: item.count
      }))
    : [];

  // Handle empty state
  if (!chartData || chartData.length === 0) {
    return (
      <div className="w-full h-[300px] bg-surface p-6 rounded-lg border border-border-tertiary shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-content-primary mb-2">Order Growth</h3>
        </div>
        <div className="h-48 flex items-center justify-center bg-surface-secondary rounded-lg">
          <div className="text-center text-content-tertiary">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <p className="text-sm">No order growth data available</p>
          </div>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...chartData.map(item => item.value), 1);
  const lastValue = chartData[chartData.length - 1]?.value || 0;

  return (
    <div className="w-full h-[300px] bg-surface p-6 rounded-lg border border-border-tertiary shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-content-primary mb-2">Order Growth</h3>
        <div className="text-content-secondary text-sm">
          Total: <span className="font-semibold text-content-primary">{lastValue.toLocaleString()}</span>
        </div>
      </div>

      <div className="h-48 flex items-end justify-between space-x-3 bg-surface-secondary rounded-lg p-4">
        {chartData.map((item, index) => (
          <div key={index} className="flex flex-col items-center flex-1 group relative">
            <div
              className="w-full rounded-t-lg min-h-[8px] bg-status-success hover:bg-status-success-dark transition-all duration-200 cursor-pointer relative"
              style={{ height: `${(item.value / maxValue) * 140}px` }}
            >
              {/* Tooltip */}
              <div className="invisible group-hover:visible absolute -top-12 left-1/2 transform -translate-x-1/2 bg-content-primary text-primary-foreground text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                {item.name}: {item.value.toLocaleString()}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-content-primary"></div>
              </div>
            </div>
            <div className="text-xs mt-2 text-content-secondary font-medium">{item.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Interactive Restaurant Status Chart (Donut Chart)
interface StatusChartProps {
  data?: Array<{ name: string; value: number; color: string }>;
}

function RestaurantStatusChart({ data }: StatusChartProps = {}) {
  // Use provided data or show empty state
  const chartData = data && data.length > 0
    ? data
    : [];

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  // Handle empty state
  if (!chartData || chartData.length === 0 || total === 0) {
    return (
      <div className="w-full h-[200px] bg-surface p-4 rounded-lg border border-border-tertiary shadow-sm">
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-content-tertiary">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-sm">No restaurant status data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[200px] bg-surface p-4 rounded-lg border border-border-tertiary shadow-sm">
      <div className="flex items-center justify-center h-full">
        <div className="relative">
          {/* Donut Chart using CSS */}
          <div className="w-32 h-32 rounded-full relative overflow-hidden shadow-lg bg-surface-secondary">
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
            <div className="absolute inset-6 bg-surface rounded-full shadow-inner flex items-center justify-center">
              <div className="text-center">
                <div className="text-lg font-bold text-content-primary">{total}</div>
                <div className="text-xs text-content-secondary">Users</div>
              </div>
            </div>
          </div>
          
          {/* Legend */}
          <div className="absolute left-36 top-0 space-y-2">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center group cursor-pointer">
                <div 
                  className="w-3 h-3 rounded-full mr-2 ring-2 ring-transparent group-hover:ring-border-secondary transition-all duration-200"
                  style={{ backgroundColor: item.color }}
                />
                <div className="text-sm">
                  <div className="font-medium text-content-primary">{item.name}</div>
                  <div className="text-xs text-content-secondary">
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
export const DynamicRestaurantStatusChart = RestaurantStatusChart;
// Legacy export for backwards compatibility
export const DynamicUserStatusChart = RestaurantStatusChart;
