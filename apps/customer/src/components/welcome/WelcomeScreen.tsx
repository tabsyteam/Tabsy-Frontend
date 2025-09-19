'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@tabsy/ui-components'
import { Smartphone, QrCode, Utensils, CreditCard, ClipboardList, ArrowRight } from 'lucide-react'
import { SessionManager } from '@/lib/session'

export function WelcomeScreen() {
  const router = useRouter()
  const [hasSession, setHasSession] = useState(false)
  const [hasOrders, setHasOrders] = useState(false)
  const [sessionInfo, setSessionInfo] = useState<{
    restaurantName?: string
    tableName?: string
  }>({})

  useEffect(() => {
    // Check for existing dining session
    const diningSession = SessionManager.getDiningSession()
    if (diningSession) {
      setHasSession(true)
      setSessionInfo({
        restaurantName: diningSession.restaurantName,
        tableName: diningSession.tableName
      })
    }

    // Check for existing order session
    const currentOrder = SessionManager.getCurrentOrder()
    if (currentOrder) {
      setHasOrders(true)
    }
  }, [])

  const handleContinueToMenu = () => {
    router.push(SessionManager.getMenuUrl())
  }

  const handleViewOrders = () => {
    router.push(SessionManager.getOrdersUrl())
  }

  return (
    <div className="text-center space-y-8">
      {/* Quick Access Section for Returning Users */}
      {(hasSession || hasOrders) && (
        <div className="bg-surface border border-default rounded-2xl p-6 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-accent rounded-full animate-pulse"></div>
              <h2 className="text-lg font-semibold text-content-primary">
                Welcome Back!
              </h2>
            </div>

            {hasSession && sessionInfo.restaurantName && (
              <p className="text-content-secondary text-sm">
                Continue your dining at <span className="font-medium text-content-primary">{sessionInfo.restaurantName}</span>
                {sessionInfo.tableName && <span className="text-content-tertiary"> • Table {sessionInfo.tableName}</span>}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
              {hasSession && (
                <Button
                  onClick={handleContinueToMenu}
                  className="flex items-center justify-center space-x-2 px-6"
                  size="lg"
                >
                  <Utensils className="w-4 h-4" />
                  <span>Continue to Menu</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}

              {(hasSession || hasOrders) && (
                <Button
                  onClick={handleViewOrders}
                  variant="outline"
                  className="flex items-center justify-center space-x-2 px-6"
                  size="lg"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>View Orders</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="space-y-4">
        <div className="w-16 h-16 mx-auto bg-primary rounded-full flex items-center justify-center">
          <Utensils className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-content-primary">
          Welcome to Tabsy
        </h1>
        <p className="text-lg text-content-secondary max-w-md mx-auto">
          Scan the QR code at your table to start ordering delicious food
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
        <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-surface shadow-sm border border-default">
          <QrCode className="w-8 h-8 text-primary" />
          <h3 className="font-semibold text-content-primary">
            Scan QR Code
          </h3>
          <p className="text-sm text-content-tertiary text-center">
            Simply scan the code at your table to get started
          </p>
        </div>

        <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-surface shadow-sm border border-default">
          <Smartphone className="w-8 h-8 text-primary" />
          <h3 className="font-semibold text-content-primary">
            Browse Menu
          </h3>
          <p className="text-sm text-content-tertiary text-center">
            Explore the full menu with photos and descriptions
          </p>
        </div>

        <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-surface shadow-sm border border-default">
          <CreditCard className="w-8 h-8 text-primary" />
          <h3 className="font-semibold text-content-primary">
            Pay Securely
          </h3>
          <p className="text-sm text-content-tertiary text-center">
            Quick and secure payment directly from your phone
          </p>
        </div>
      </div>

      {/* CTA Section */}
      <div className="mt-12 space-y-4">
        <p className="text-content-secondary">
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
