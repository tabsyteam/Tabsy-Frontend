'use client'

import React from 'react'
import { Button } from '@tabsy/ui-components'
import { Smartphone, QrCode, Utensils, CreditCard } from 'lucide-react'

export function WelcomeScreen() {
  return (
    <div className="text-center space-y-8">
      {/* Hero Section */}
      <div className="space-y-4">
        <div className="w-16 h-16 mx-auto bg-primary rounded-full flex items-center justify-center">
          <Utensils className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome to Tabsy
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-md mx-auto">
          Scan the QR code at your table to start ordering delicious food
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
        <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-white dark:bg-gray-800 shadow-sm border">
          <QrCode className="w-8 h-8 text-primary" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Scan QR Code
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Simply scan the code at your table to get started
          </p>
        </div>

        <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-white dark:bg-gray-800 shadow-sm border">
          <Smartphone className="w-8 h-8 text-primary" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Browse Menu
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Explore the full menu with photos and descriptions
          </p>
        </div>

        <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-white dark:bg-gray-800 shadow-sm border">
          <CreditCard className="w-8 h-8 text-primary" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Pay Securely
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Quick and secure payment directly from your phone
          </p>
        </div>
      </div>

      {/* CTA Section */}
      <div className="mt-12 space-y-4">
        <p className="text-gray-600 dark:text-gray-400">
          Ready to get started?
        </p>
        <Button 
          size="lg" 
          className="w-full sm:w-auto px-8"
          onClick={() => {
            // Scroll to QR scanner
            document.querySelector('#qr-scanner')?.scrollIntoView({ behavior: 'smooth' })
          }}
        >
          Scan QR Code
        </Button>
      </div>
    </div>
  )
}
