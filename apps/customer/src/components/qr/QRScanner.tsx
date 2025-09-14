'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, ErrorBoundary, LoadingState } from '@tabsy/ui-components'
import { Camera, Upload, X, Loader2 } from 'lucide-react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useApi } from '@/components/providers/api-provider'
import { toast } from 'sonner'

export function QRScanner() {
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null)
  const scannerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { api } = useApi()

  const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0,
    disableFlip: false,
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true
    }
  }

  const handleScanSuccess = async (decodedText: string, decodedResult: any) => {
    setIsProcessing(true)
    
    try {
      // Stop the scanner
      if (scanner) {
        await scanner.clear()
        setScanner(null)
        setIsScanning(false)
      }

      // Extract QR code from the scanned text
      // The QR code might be a full URL or just the code
      const qrCode = extractQRCode(decodedText)
      
      if (!qrCode) {
        toast.error('Invalid QR Code', {
          description: 'The scanned QR code is not a valid restaurant table code. Please try scanning again.'
        })
        setIsProcessing(false)
        return
      }

      // Call the API to get table information with retry logic
      const response = await api.qr.getTableInfo(qrCode)
      
      if (response.success && response.data) {
        const { restaurant, table, isActive } = response.data
        
        if (!isActive) {
          toast.error('Table Unavailable', {
            description: 'This table is currently unavailable. Please contact restaurant staff for assistance.',
            action: {
              label: 'Scan Again',
              onClick: () => startScanning()
            }
          })
          setIsProcessing(false)
          return
        }
        
        // Store table and restaurant info in sessionStorage for the flow
        sessionStorage.setItem('tabsy-table-info', JSON.stringify({
          restaurant,
          table,
          qrCode
        }))

        // Create a guest session
        const sessionResponse = await api.session.createGuest({
          restaurantId: restaurant.id,
          tableId: table.id,
          qrCode
        })

        if (sessionResponse.success && sessionResponse.data) {
          sessionStorage.setItem('tabsy-session', JSON.stringify(sessionResponse.data))
          
          toast.success(`Welcome to ${restaurant.name}!`)
          
          // Navigate to menu
          router.push(`/menu?restaurant=${restaurant.id}&table=${table.id}`)
        } else {
          toast.error('Session Error', {
            description: 'Failed to create dining session. Please try scanning the QR code again.',
            action: {
              label: 'Retry',
              onClick: () => startScanning()
            }
          })
          setIsProcessing(false)
        }
      } else {
        toast.error('Invalid QR Code', {
          description: 'QR code not found or invalid. Please ensure you\'re scanning a valid restaurant table QR code.',
          action: {
            label: 'Scan Again',
            onClick: () => startScanning()
          }
        })
        setIsProcessing(false)
      }
    } catch (error: any) {
      console.error('QR scan error:', error)
      
      // Determine error type and show appropriate message
      let errorTitle = 'Scan Failed'
      let errorDescription = 'Failed to process QR code. Please try again.'
      
      if (error?.response?.status === 404) {
        errorTitle = 'Table Not Found'
        errorDescription = 'This QR code doesn\'t correspond to any table. Please check with restaurant staff.'
      } else if (error?.response?.status === 403) {
        errorTitle = 'Access Denied'
        errorDescription = 'This table is not available for ordering at the moment.'
      } else if (error?.code === 'NETWORK_ERROR' || !error?.response) {
        errorTitle = 'Connection Error'
        errorDescription = 'Unable to connect to the server. Please check your internet connection.'
      }
      
      toast.error(errorTitle, {
        description: errorDescription,
        action: {
          label: 'Try Again',
          onClick: () => startScanning()
        }
      })
      setIsProcessing(false)
    }
  }

  const handleScanError = (errorMessage: string) => {
    // Don't show error for every frame, only log
    console.log('QR scan frame error:', errorMessage)
  }

  const extractQRCode = (scannedText: string): string | null => {
    // Handle different QR code formats
    try {
      // If it's a full URL, extract the code from the path
      if (scannedText.startsWith('http')) {
        const url = new URL(scannedText)
        const pathParts = url.pathname.split('/')
        const lastPart = pathParts[pathParts.length - 1]
        return lastPart || null
      }
      
      // If it's just the code, return it
      if (scannedText.length > 0) {
        return scannedText
      }
      
      return null
    } catch {
      return scannedText
    }
  }

  const startScanning = async () => {
    if (!scannerRef.current || isScanning) return

    try {
      setIsScanning(true)
      
      const newScanner = new Html5QrcodeScanner(
        'qr-scanner-container',
        config,
        false
      )
      
      newScanner.render(handleScanSuccess, handleScanError)
      setScanner(newScanner)
    } catch (error) {
      console.error('Failed to start scanner:', error)
      toast.error('Failed to start camera')
      setIsScanning(false)
    }
  }

  const stopScanning = async () => {
    if (scanner) {
      try {
        await scanner.clear()
        setScanner(null)
        setIsScanning(false)
      } catch (error) {
        console.error('Failed to stop scanner:', error)
      }
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      // Use Html5Qrcode for file scanning instead of Html5QrcodeScanner
      const { Html5Qrcode } = await import('html5-qrcode')
      const html5QrCode = new Html5Qrcode('qr-scanner-container')
      
      const result = await html5QrCode.scanFile(file, true)
      await handleScanSuccess(result, {})
    } catch (error: any) {
      console.error('File scan error:', error)
      toast.error('Could not read QR code from image')
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanner) {
        scanner.clear().catch(console.error)
      }
    }
  }, [scanner])

  if (isProcessing) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Processing QR Code...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please wait while we connect you to your table
          </p>
        </div>

        <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg aspect-square max-w-sm mx-auto overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
              <p className="text-gray-500 text-sm">
                Connecting to restaurant...
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div id="qr-scanner" className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Scan QR Code
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Point your camera at the QR code on your table
        </p>
      </div>

      {/* Scanner Area */}
      <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg max-w-sm mx-auto overflow-hidden">
        {isScanning ? (
          <div>
            <div className="flex justify-end p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={stopScanning}
                className="absolute top-2 right-2 z-10 bg-black/50 text-white hover:bg-black/70"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div ref={scannerRef} id="qr-scanner-container" />
          </div>
        ) : (
          <div className="aspect-square flex items-center justify-center">
            <div className="text-center space-y-4 p-8">
              <Camera className="w-16 h-16 text-gray-400 mx-auto" />
              <p className="text-gray-500 text-sm">
                Camera will appear here
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          size="lg"
          onClick={isScanning ? stopScanning : startScanning}
          className="flex items-center gap-2"
        >
          {isScanning ? (
            <>
              <X className="w-5 h-5" />
              Stop Camera
            </>
          ) : (
            <>
              <Camera className="w-5 h-5" />
              Start Camera
            </>
          )}
        </Button>
        
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer"
            id="qr-upload"
          />
          <Button
            variant="outline"
            size="lg"
            className="flex items-center gap-2 w-full"
            asChild
          >
            <label htmlFor="qr-upload" className="cursor-pointer">
              <Upload className="w-5 h-5" />
              Upload Image
            </label>
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        <p>Can't scan the code?</p>
        <button 
          className="text-primary hover:underline font-medium"
          onClick={() => router.push('/manual-entry')}
        >
          Enter restaurant code manually
        </button>
      </div>
    </div>
  )
}

// Export the QRScanner wrapped with error boundary
export function QRScannerWithErrorBoundary() {
  return (
    <ErrorBoundary 
      level="component"
      showErrorDetails={false}
      onError={(error: Error, errorInfo: React.ErrorInfo, errorId: string) => {
        toast.error('QR Scanner Error', {
          description: 'There was an issue with the QR scanner. Please try refreshing the page.',
          action: {
            label: 'Refresh',
            onClick: () => window.location.reload()
          }
        })
        console.error('QR Scanner error:', { error, errorInfo, errorId })
      }}
    >
      <QRScanner />
    </ErrorBoundary>
  )
}
