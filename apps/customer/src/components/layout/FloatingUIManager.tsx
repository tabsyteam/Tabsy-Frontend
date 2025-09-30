'use client'

import { FloatingPayButton } from '@/components/payment/FloatingPayButton'

/**
 * Manager component for all floating UI elements
 * Positioned as a portal above other content
 */
export function FloatingUIManager() {
  return (
    <>
      {/* Floating Pay Button */}
      <FloatingPayButton />

      {/* Future floating elements can be added here */}
    </>
  )
}