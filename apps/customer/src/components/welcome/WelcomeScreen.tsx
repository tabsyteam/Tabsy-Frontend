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
    <div className="text-center space-y-10">
      {/* Quick Access Section for Returning Users */}
      {(hasSession || hasOrders) && (
        <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20 rounded-3xl p-6 shadow-lg backdrop-blur-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-4 h-4 bg-accent rounded-full animate-pulse shadow-lg"></div>
              <h2 className="text-xl font-bold text-content-primary">
                Welcome Back!
              </h2>
            </div>

            {hasSession && sessionInfo.restaurantName && (
              <p className="text-content-secondary">
                Continue your dining at <span className="font-semibold text-primary">{sessionInfo.restaurantName}</span>
                {sessionInfo.tableName && <span className="text-content-tertiary"> • Table {sessionInfo.tableName}</span>}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
              {hasSession && (
                <Button
                  onClick={handleContinueToMenu}
                  className="flex items-center justify-center space-x-2 px-8 shadow-lg"
                  size="lg"
                >
                  <Utensils className="w-5 h-5" />
                  <span>Continue to Menu</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}

              {(hasSession || hasOrders) && (
                <Button
                  onClick={handleViewOrders}
                  variant="outline"
                  className="flex items-center justify-center space-x-2 px-8 border-primary/30 hover:bg-primary/5"
                  size="lg"
                >
                  <ClipboardList className="w-5 h-5" />
                  <span>View Orders</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="space-y-8">
        <div className="relative">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary to-secondary rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
            <Utensils className="w-12 h-12 text-white relative z-10" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-content-primary leading-tight">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Tabsy</span>
          </h1>
          <p className="text-xl text-content-secondary max-w-2xl mx-auto leading-relaxed">
            Scan the QR code at your table to start ordering delicious food instantly
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
        <div className="group hover:scale-105 transition-all duration-300">
          <div className="flex flex-col items-center space-y-4 p-8 rounded-3xl bg-surface shadow-lg border border-default/50 hover:border-primary/30 hover:shadow-xl transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300">
              <QrCode className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-content-primary">
              Scan QR Code
            </h3>
            <p className="text-content-secondary text-center leading-relaxed">
              Simply scan the code at your table to get started instantly
            </p>
          </div>
        </div>

        <div className="group hover:scale-105 transition-all duration-300">
          <div className="flex flex-col items-center space-y-4 p-8 rounded-3xl bg-surface shadow-lg border border-default/50 hover:border-primary/30 hover:shadow-xl transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-2xl flex items-center justify-center group-hover:from-secondary/20 group-hover:to-secondary/10 transition-all duration-300">
              <Smartphone className="w-8 h-8 text-secondary" />
            </div>
            <h3 className="text-lg font-bold text-content-primary">
              Browse Menu
            </h3>
            <p className="text-content-secondary text-center leading-relaxed">
              Explore the full menu with photos, descriptions, and real-time availability
            </p>
          </div>
        </div>

        <div className="group hover:scale-105 transition-all duration-300">
          <div className="flex flex-col items-center space-y-4 p-8 rounded-3xl bg-surface shadow-lg border border-default/50 hover:border-primary/30 hover:shadow-xl transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl flex items-center justify-center group-hover:from-accent/20 group-hover:to-accent/10 transition-all duration-300">
              <CreditCard className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-lg font-bold text-content-primary">
              Pay Securely
            </h3>
            <p className="text-content-secondary text-center leading-relaxed">
              Quick and secure payment directly from your phone with multiple options
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="mt-16 space-y-6">
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-content-primary">
            Ready to get started?
          </h2>
          <p className="text-content-secondary text-lg">
            Scan the QR code below or take a photo to begin your dining experience
          </p>
        </div>

        <Button
          size="lg"
          className="w-full sm:w-auto px-12 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          onClick={() => {
            // Scroll to QR scanner
            document.querySelector('#qr-scanner')?.scrollIntoView({ behavior: 'smooth' })
          }}
        >
          <QrCode className="w-5 h-5 mr-2" />
          Scan QR Code
        </Button>
      </div>
    </div>
  )
}
