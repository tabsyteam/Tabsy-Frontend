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
    videoConstraints: {
      facingMode: "environment" // Use back camera on mobile
    },
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true
    },
    supportedScanTypes: [
      // @ts-ignore - Html5QrcodeScanType is not properly exported
      0, 1 // QR Code and Code 128
    ]
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

  const checkCameraPermissions = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach(track => track.stop()) // Stop the stream immediately
      return true
    } catch (error) {
      console.error('Camera permission denied:', error)
      return false
    }
  }

  const startScanning = async () => {
    if (!scannerRef.current || isScanning) return

    try {
      // Check camera permissions first
      const hasPermission = await checkCameraPermissions()
      if (!hasPermission) {
        toast.error('Camera access required', {
          description: 'Please allow camera access to scan QR codes. Check your browser settings and try again.',
          action: {
            label: 'Retry',
            onClick: () => startScanning()
          }
        })
        return
      }

      setIsScanning(true)

      const newScanner = new Html5QrcodeScanner(
        'qr-scanner-container',
        config,
        false
      )

      newScanner.render(handleScanSuccess, handleScanError)
      setScanner(newScanner)
    } catch (error: any) {
      console.error('Failed to start scanner:', error)

      let errorMessage = 'Failed to start camera'
      let errorDescription = 'Please try again or use the upload image option.'

      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied'
        errorDescription = 'Please allow camera access in your browser settings and try again.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found'
        errorDescription = 'Please ensure your device has a camera and try again.'
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Camera not supported'
        errorDescription = 'Your browser may not support camera access. Try using a different browser.'
      }

      toast.error(errorMessage, {
        description: errorDescription,
        action: {
          label: 'Try Again',
          onClick: () => startScanning()
        }
      })
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
    <div id="qr-scanner" className="space-y-8">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold text-content-primary">
          Scan QR Code
        </h2>
        <p className="text-lg text-content-secondary max-w-md mx-auto">
          Point your camera at the QR code on your table to get started
        </p>
      </div>

      {/* Scanner Area */}
      <div className="relative bg-surface border border-default rounded-3xl max-w-sm mx-auto overflow-hidden shadow-xl">
        {isScanning ? (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={stopScanning}
              className="absolute top-3 right-3 z-20 bg-black/70 text-white hover:bg-black/80 rounded-full w-10 h-10 p-0 shadow-lg"
            >
              <X className="w-5 h-5" />
            </Button>
            <div ref={scannerRef} id="qr-scanner-container" className="[&>div]:!border-0 [&>div]:!rounded-3xl" />

            {/* Scanning overlay */}
            <div className="absolute inset-4 border-2 border-primary rounded-2xl animate-pulse pointer-events-none">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
            </div>
          </div>
        ) : (
          <div className="aspect-square flex items-center justify-center bg-gradient-to-br from-surface-secondary to-surface-tertiary">
            <div className="text-center space-y-6 p-8">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                  <Camera className="w-10 h-10 text-primary" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-2xl animate-pulse"></div>
              </div>
              <div className="space-y-2">
                <p className="text-content-primary font-semibold">
                  Camera Ready
                </p>
                <p className="text-content-secondary text-sm">
                  Tap "Start Camera" to begin scanning
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          size="lg"
          onClick={isScanning ? stopScanning : startScanning}
          className="flex items-center gap-3 px-8 shadow-lg hover:shadow-xl transition-all duration-300"
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
            className="flex items-center gap-3 w-full px-8 border-primary/30 hover:bg-primary/5 transition-all duration-300"
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
      <div className="text-center space-y-3">
        <p className="text-content-secondary">
          Can't scan the code?
        </p>
        <Button
          variant="ghost"
          className="text-primary hover:text-primary-hover font-medium"
          onClick={() => router.push('/manual-entry')}
        >
          Enter restaurant code manually
        </Button>
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
