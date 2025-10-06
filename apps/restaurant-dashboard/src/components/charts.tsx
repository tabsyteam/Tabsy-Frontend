'use client';

import React from 'react';
import { formatPrice, type CurrencyCode } from '@tabsy/shared-utils/formatting/currency';

interface WeeklyOverviewChartProps {
  data?: Array<{ day: string; orders: number; revenue: number }>;
  currency?: CurrencyCode;
}

// Interactive chart component for restaurant dashboard
function WeeklyOverviewChart({ data, currency = 'USD' }: WeeklyOverviewChartProps) {
  // Sample data if none provided
  const chartData = data || [
    { day: "Mon", orders: 24, revenue: 1200 },
    { day: "Tue", orders: 32, revenue: 1600 },
    { day: "Wed", orders: 28, revenue: 1400 },
    { day: "Thu", orders: 38, revenue: 1900 },
    { day: "Fri", orders: 52, revenue: 2600 },
    { day: "Sat", orders: 68, revenue: 3400 },
    { day: "Sun", orders: 45, revenue: 2250 },
  ];

  const maxOrders = Math.max(...chartData.map(item => item.orders));
  const maxRevenue = Math.max(...chartData.map(item => item.revenue));
  const totalOrders = chartData.reduce((sum, item) => sum + item.orders, 0);

  return (
    <div className="w-full h-[300px] bg-card rounded-lg border border-border">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Weekly Orders Overview</h4>
            <p className="text-2xl font-bold text-foreground">{totalOrders} orders this week</p>
          </div>
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-primary rounded-sm mr-2"></div>
              <span className="text-muted-foreground">Orders</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-secondary rounded-sm mr-2"></div>
              <span className="text-muted-foreground">Revenue</span>
            </div>
          </div>
        </div>
        
        <div className="h-48 flex items-end justify-between space-x-2">
          {chartData.map((item, index) => (
            <div key={index} className="flex flex-col items-center flex-1 relative group">
              <div className="w-full flex flex-col items-center space-y-1">
                {/* Revenue bar (background) */}
                <div
                  className="bg-secondary/30 w-full rounded-t-sm min-h-[4px] relative"
                  style={{ height: `${(item.revenue / maxRevenue) * 140}px` }}
                >
                  {/* Orders bar (foreground) */}
                  <div
                    className="bg-primary w-full rounded-t-sm absolute bottom-0"
                    style={{ height: `${(item.orders / maxOrders) * 140}px` }}
                  />
                </div>
                
                {/* Tooltip on hover */}
                <div className="invisible group-hover:visible absolute -top-20 left-1/2 transform -translate-x-1/2 bg-foreground text-background text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  <div className="text-center">
                    <div>Orders: {item.orders}</div>
                    <div>Revenue: {formatPrice(item.revenue, currency)}</div>
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-foreground"></div>
                </div>
              </div>
              
              <div className="text-xs mt-2 text-muted-foreground font-medium">{item.day}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const DynamicWeeklyOverviewChart = WeeklyOverviewChart;
