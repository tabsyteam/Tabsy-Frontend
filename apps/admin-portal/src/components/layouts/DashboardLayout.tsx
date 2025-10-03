'use client';

import { Sidebar } from '../navigation/Sidebar';
import { Breadcrumb, BreadcrumbItem } from '../navigation/Breadcrumb';
import { UserMenu } from '../navigation/UserMenu';

interface DashboardLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export function DashboardLayout({ children, breadcrumbs }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="pl-64 transition-all duration-300">
        {/* Top Bar */}
        <header className="h-16 bg-surface border-b border-border-default fixed top-0 right-0 left-64 z-30 transition-all duration-300">
          <div className="h-full px-6 flex items-center justify-between">
            {/* Breadcrumbs */}
            <div className="flex-1">
              {breadcrumbs && <Breadcrumb items={breadcrumbs} />}
            </div>

            {/* User Menu */}
            <UserMenu />
          </div>
        </header>

        {/* Page Content */}
        <main className="pt-16 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
