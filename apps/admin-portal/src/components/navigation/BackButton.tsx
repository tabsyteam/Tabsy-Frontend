'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@tabsy/ui-components';

interface BackButtonProps {
  fallbackHref?: string;
  label?: string;
  confirmMessage?: string;
  className?: string;
}

export function BackButton({
  fallbackHref = '/dashboard',
  label = 'Back',
  confirmMessage,
  className
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (confirmMessage && !confirm(confirmMessage)) {
      return;
    }

    // Try to go back in history, otherwise use fallback
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <Button
      variant="ghost"
      onClick={handleBack}
      className={className}
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}
