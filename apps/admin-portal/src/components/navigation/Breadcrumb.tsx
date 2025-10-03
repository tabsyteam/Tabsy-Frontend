'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { Fragment } from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
      {/* Home icon */}
      <Link
        href="/dashboard"
        className="text-content-secondary hover:text-primary transition-colors"
        aria-label="Go to dashboard"
      >
        <Home className="h-4 w-4" />
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const Icon = item.icon;

        return (
          <Fragment key={index}>
            <ChevronRight className="h-4 w-4 text-content-tertiary" />

            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-content-secondary hover:text-primary transition-colors inline-flex items-center gap-1.5"
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </Link>
            ) : (
              <span className="text-content-primary font-medium inline-flex items-center gap-1.5">
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
