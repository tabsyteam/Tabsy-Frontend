'use client';

import { useState, useEffect } from 'react';
import NextImage from 'next/image';
import { Button } from '@tabsy/ui-components';
import { Table } from '@tabsy/shared-types';
import {
  X,
  Download,
  Printer,
  Copy,
  RefreshCw,
  ExternalLink,
  QrCode,
  Share2,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { createTableHooks } from '@tabsy/react-query-hooks';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface QRCodeManagerProps {
  table: Table;
  restaurantId: string;
  onClose: () => void;
}

export function QRCodeManager({ table, restaurantId, onClose }: QRCodeManagerProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string>('');

  const tableHooks = createTableHooks(useQuery);

  // Get QR code data
  const {
    data: qrResponse,
    isLoading: qrLoading,
    error: qrError,
    refetch: refetchQR,
  } = tableHooks.useTableQRCode(restaurantId, table.id);

  // Get QR code image
  const {
    data: qrImageResponse,
    isLoading: qrImageLoading,
    error: qrImageError,
    refetch: refetchQRImage,
  } = tableHooks.useTableQRCodeImage(restaurantId, table.id);

  const qrData = qrResponse?.data;

  // Process QR code image when it's loaded
  useEffect(() => {
    console.log('QR Image Response:', qrImageResponse);
    console.log('QR Image Response type:', typeof qrImageResponse);
    console.log('QR Image Response keys:', qrImageResponse ? Object.keys(qrImageResponse) : 'none');
    console.log('QR Image Response.data:', qrImageResponse?.data);
    console.log('QR Image Response.data keys:', qrImageResponse?.data ? Object.keys(qrImageResponse.data) : 'none');
    console.log('QR Image Error:', qrImageError);

    if (qrImageResponse?.data?.data) {
      console.log('QR Image Data:', qrImageResponse.data.data);
      // The backend returns JSON with dataUrl property wrapped in response.data.data
      if (qrImageResponse.data.data && qrImageResponse.data.data.dataUrl) {
        console.log('Setting QR Image URL:', qrImageResponse.data.data.dataUrl.substring(0, 50) + '...');
        setQrImageUrl(qrImageResponse.data.data.dataUrl);
      } else {
        console.log('No dataUrl found in response');
      }
    } else {
      console.log('No qrImageResponse.data.data found');
      // Let's check alternative structures
      if (qrImageResponse?.data?.dataUrl) {
        console.log('Found dataUrl at qrImageResponse.data.dataUrl');
        setQrImageUrl(qrImageResponse.data.dataUrl);
      } else if (qrImageResponse?.dataUrl) {
        console.log('Found dataUrl at qrImageResponse.dataUrl');
        setQrImageUrl(qrImageResponse.dataUrl);
      }
    }
  }, [qrImageResponse, qrImageError]);

  const handleCopyUrl = async () => {
    const url = qrData?.qrCodeUrl || qrData?.accessUrl || qrImageResponse?.data?.data?.accessUrl;
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      toast.success('QR code URL copied to clipboard');
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (error) {
      toast.error('Failed to copy URL');
    }
  };

  const handleDownloadQR = async () => {
    const url = qrData?.qrCodeUrl || qrData?.accessUrl || qrImageResponse?.data?.data?.accessUrl;
    if (!url || !qrImageUrl) {
      toast.error('QR code image not available');
      return;
    }

    setIsDownloading(true);
    try {
      // Create a canvas to combine QR code with table info
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const size = 600;

      canvas.width = size;
      canvas.height = size + 150; // Extra space for text

      if (ctx) {
        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Create Tabsy logo as base64 (simplified version for canvas)
        const createTabsyLogo = () => {
          const logoCanvas = document.createElement('canvas');
          const logoCtx = logoCanvas.getContext('2d');
          logoCanvas.width = 200;
          logoCanvas.height = 60;

          if (logoCtx) {
            // Tabsy brand colors - Updated to new theme
            const primaryColor = '#0D9488'; // Teal
            const blueColor = '#1E3A8A'; // Blue (logo color)

            // Draw simplified Tabsy logo elements
            logoCtx.fillStyle = blueColor;
            logoCtx.fillRect(10, 10, 40, 40);
            logoCtx.fillStyle = '#FFFFFF';
            logoCtx.font = 'bold 8px Arial';
            logoCtx.textAlign = 'center';
            logoCtx.fillText('T', 30, 33);

            // "Tabsy" text
            logoCtx.fillStyle = blueColor;
            logoCtx.font = 'bold 24px Arial';
            logoCtx.textAlign = 'left';
            logoCtx.fillText('Tab', 60, 35);

            logoCtx.fillStyle = primaryColor;
            logoCtx.fillText('sy', 120, 35);
          }
          return logoCanvas;
        };

        // Load both QR image and create logo
        const qrImage = new Image();
        qrImage.onload = () => {
          // Create branded background with gradient
          const gradient = ctx.createLinearGradient(0, 0, size, size);
          gradient.addColorStop(0, '#F0FDFA'); // teal-50
          gradient.addColorStop(0.5, '#FAF5FF'); // violet-50
          gradient.addColorStop(1, '#F0FDFA'); // teal-50
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Add subtle pattern overlay
          ctx.fillStyle = 'rgba(13, 148, 136, 0.03)';
          for (let i = 0; i < size; i += 20) {
            for (let j = 0; j < size; j += 20) {
              if ((i + j) % 40 === 0) {
                ctx.fillRect(i, j, 10, 10);
              }
            }
          }

          // Header with Tabsy logo
          const logoCanvas = createTabsyLogo();
          ctx.drawImage(logoCanvas, (size - 200) / 2, 20);

          // Main title
          ctx.fillStyle = '#1E3A8A';
          ctx.font = 'bold 32px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(`Table ${table.tableNumber}`, size / 2, 120);

          // Subtitle
          ctx.fillStyle = '#0D9488';
          ctx.font = '20px Arial';
          ctx.fillText('Digital Menu Experience', size / 2, 150);

          // QR Code with branded border
          const qrSize = 350;
          const qrX = (size - qrSize) / 2;
          const qrY = 180;

          // QR Code background with shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
          ctx.fillRect(qrX + 5, qrY + 5, qrSize, qrSize);

          // QR Code white background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(qrX, qrY, qrSize, qrSize);

          // QR Code border
          ctx.strokeStyle = '#0D9488';
          ctx.lineWidth = 3;
          ctx.strokeRect(qrX, qrY, qrSize, qrSize);

          // Draw the actual QR code
          const padding = 20;
          ctx.drawImage(qrImage, qrX + padding, qrY + padding, qrSize - (padding * 2), qrSize - (padding * 2));

          // Bottom section with instructions
          const bottomY = qrY + qrSize + 40;

          // Instructions background
          ctx.fillStyle = 'rgba(13, 148, 136, 0.1)';
          ctx.fillRect(50, bottomY, size - 100, 120);
          ctx.strokeStyle = '#0D9488';
          ctx.lineWidth = 2;
          ctx.strokeRect(50, bottomY, size - 100, 120);

          // Instructions text
          ctx.fillStyle = '#1E3A8A';
          ctx.font = 'bold 18px Arial';
          ctx.fillText('How to Use This QR Code', size / 2, bottomY + 25);

          ctx.fillStyle = '#334155';
          ctx.font = '14px Arial';
          ctx.textAlign = 'left';
          const instructions = [
            '1. Point your phone camera at the QR code',
            '2. Tap the notification that appears',
            '3. Browse our digital menu',
            '4. Place your order directly from your phone'
          ];

          instructions.forEach((instruction, index) => {
            ctx.fillText(instruction, 70, bottomY + 50 + (index * 18));
          });

          // Footer with URL and branding
          ctx.fillStyle = '#64748B';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          const urlText = url.length > 50 ? url.substring(0, 50) + '...' : url;
          ctx.fillText(urlText, size / 2, canvas.height - 40);

          // Powered by Tabsy
          ctx.fillStyle = '#0D9488';
          ctx.font = 'bold 14px Arial';
          ctx.fillText('Powered by Tabsy • Seamless Dining Experience', size / 2, canvas.height - 15);

          // Download the canvas as PNG
          canvas.toBlob((blob) => {
            if (blob) {
              const downloadUrl = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = downloadUrl;
              a.download = `tabsy-table-${table.tableNumber}-qr-menu.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(downloadUrl);
              toast.success('Tabsy QR code downloaded successfully');
            }
          }, 'image/png');
        };

        qrImage.onerror = () => {
          toast.error('Failed to load QR code image');
        };

        qrImage.src = qrImageUrl;
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download QR code');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    const url = qrData?.qrCodeUrl || qrData?.accessUrl || qrImageResponse?.data?.data?.accessUrl;
    if (!url || !qrImageUrl) {
      toast.error('QR code image not available for printing');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Tabsy - Table ${table.tableNumber} QR Menu</title>
            <style>
              @media print {
                @page {
                  margin: 0.3in;
                  size: A4;
                }
                body {
                  margin: 0;
                  padding: 0;
                }
                .no-print {
                  display: none;
                }
              }

              body {
                font-family: 'Arial', sans-serif;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #F0FDFA 0%, #FAF5FF 50%, #F0FDFA 100%);
                color: #1E3A8A;
              }

              .print-container {
                max-width: 550px;
                margin: 0 auto;
                background: white;
                border-radius: 15px;
                overflow: hidden;
                box-shadow: 0 15px 30px rgba(0,0,0,0.1);
                position: relative;
              }

              /* Tabsy Header */
              .tabsy-header {
                background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%);
                color: white;
                padding: 20px 25px;
                text-align: center;
                position: relative;
                overflow: hidden;
              }

              .tabsy-header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
                opacity: 0.3;
              }

              .logo-section {
                position: relative;
                z-index: 2;
                margin-bottom: 15px;
              }

              .tabsy-logo {
                font-size: 28px;
                font-weight: bold;
                letter-spacing: -1px;
                margin-bottom: 3px;
              }

              .tagline {
                font-size: 12px;
                opacity: 0.9;
                margin-bottom: 15px;
              }

              .table-header {
                font-size: 24px;
                font-weight: bold;
                margin: 0;
              }

              .table-subtitle {
                font-size: 14px;
                opacity: 0.9;
                margin: 3px 0 0 0;
              }

              /* Main Content */
              .content-section {
                padding: 25px 20px;
                text-align: center;
              }

              .qr-section {
                margin: 20px 0;
                position: relative;
              }

              .qr-wrapper {
                display: inline-block;
                padding: 15px;
                background: white;
                border-radius: 15px;
                box-shadow: 0 8px 20px rgba(13, 148, 136, 0.2);
                border: 2px solid #0D9488;
                position: relative;
                overflow: hidden;
              }

              .qr-wrapper::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(45deg, transparent 40%, rgba(13, 148, 136, 0.05) 50%, transparent 60%);
                pointer-events: none;
              }

              .qr-image {
                width: 220px;
                height: 220px;
                display: block;
                position: relative;
                z-index: 2;
                border-radius: 8px;
              }

              .qr-label {
                margin-top: 12px;
                font-size: 14px;
                font-weight: bold;
                color: #1E3A8A;
              }

              /* Instructions */
              .instructions-section {
                background: linear-gradient(135deg, rgba(13, 148, 136, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
                border-radius: 12px;
                padding: 18px;
                margin: 20px 0;
                border: 2px solid rgba(13, 148, 136, 0.2);
              }

              .instructions-title {
                font-size: 16px;
                font-weight: bold;
                color: #1E3A8A;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
              }

              .instructions-list {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                margin-bottom: 15px;
              }

              .instruction-item {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                text-align: left;
              }

              .step-number {
                background: linear-gradient(135deg, #0D9488, #0F766E);
                color: white;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: bold;
                flex-shrink: 0;
              }

              .step-text {
                font-size: 12px;
                color: #334155;
                line-height: 1.3;
              }

              .step-title {
                font-weight: bold;
                color: #1E3A8A;
                display: block;
                margin-bottom: 1px;
              }

              /* Features */
              .features-section {
                margin: 15px 0;
                text-align: center;
              }

              .features-grid {
                display: flex;
                justify-content: center;
                gap: 12px;
                flex-wrap: wrap;
              }

              .feature-item {
                background: white;
                padding: 8px 12px;
                border-radius: 20px;
                border: 1px solid rgba(13, 148, 136, 0.2);
                font-size: 11px;
                font-weight: 600;
                color: #1E3A8A;
                position: relative;
                overflow: hidden;
              }

              .feature-item::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(13, 148, 136, 0.1), transparent);
                transition: left 0.5s;
              }

              /* Footer */
              .footer-section {
                background: #1E3A8A;
                color: white;
                padding: 15px 20px;
                text-align: center;
              }

              .url-section {
                font-family: 'Courier New', monospace;
                font-size: 9px;
                background: rgba(255,255,255,0.1);
                padding: 8px 12px;
                border-radius: 6px;
                margin-bottom: 10px;
                word-break: break-all;
              }

              .powered-by {
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 3px;
              }

              .company-tagline {
                font-size: 10px;
                opacity: 0.8;
              }

              /* Decorative Elements */
              .decoration {
                position: absolute;
                background: rgba(13, 148, 136, 0.1);
                border-radius: 50%;
              }

              .decoration-1 {
                width: 100px;
                height: 100px;
                top: -50px;
                right: -50px;
              }

              .decoration-2 {
                width: 60px;
                height: 60px;
                bottom: -30px;
                left: -30px;
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              <div class="decoration decoration-1"></div>
              <div class="decoration decoration-2"></div>

              <!-- Tabsy Branded Header -->
              <div class="tabsy-header">
                <div class="logo-section">
                  <div class="tabsy-logo">Tabsy</div>
                  <div class="tagline">Digital Menu Experience</div>
                </div>
                <h1 class="table-header">Table ${table.tableNumber}</h1>
                <p class="table-subtitle">Capacity: ${table.capacity} seats • Scan to Order</p>
              </div>

              <!-- Main Content -->
              <div class="content-section">
                <!-- QR Code Section -->
                <div class="qr-section">
                  <div class="qr-wrapper">
                    <img src="${qrImageUrl}" alt="Tabsy QR Code for Table ${table.tableNumber}" class="qr-image" />
                  </div>
                  <div class="qr-label">📱 Scan with Your Phone Camera</div>
                </div>

                <!-- Instructions -->
                <div class="instructions-section">
                  <div class="instructions-title">
                    🍽️ How to Order with Tabsy
                  </div>
                  <div class="instructions-list">
                    <div class="instruction-item">
                      <div class="step-number">1</div>
                      <div class="step-text">
                        <span class="step-title">Open Camera</span>
                        Point your phone camera at the QR code
                      </div>
                    </div>
                    <div class="instruction-item">
                      <div class="step-number">2</div>
                      <div class="step-text">
                        <span class="step-title">Tap Notification</span>
                        Tap the link that appears on your screen
                      </div>
                    </div>
                    <div class="instruction-item">
                      <div class="step-number">3</div>
                      <div class="step-text">
                        <span class="step-title">Browse Menu</span>
                        Explore our digital menu with photos
                      </div>
                    </div>
                    <div class="instruction-item">
                      <div class="step-number">4</div>
                      <div class="step-text">
                        <span class="step-title">Order & Pay</span>
                        Place your order and pay securely online
                      </div>
                    </div>
                  </div>

                  <!-- Features -->
                  <div class="features-section">
                    <div class="features-grid">
                      <div class="feature-item">⚡ Instant Access</div>
                      <div class="feature-item">🛡️ Contactless</div>
                      <div class="feature-item">💳 Secure Payment</div>
                      <div class="feature-item">📊 Real-time Updates</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="footer-section">
                <div class="url-section">${url}</div>
                <div class="powered-by">Powered by Tabsy</div>
                <div class="company-tagline">Revolutionizing Restaurant Dining Experience</div>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();

      // Wait for the image to load before printing
      const img = printWindow.document.querySelector('.qr-code-image') as HTMLImageElement;
      if (img) {
        img.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500); // Small delay to ensure everything is rendered
        };
        img.onerror = () => {
          toast.error('Failed to load QR code image for printing');
          printWindow.close();
        };
      } else {
        setTimeout(() => {
          printWindow.print();
        }, 1000);
      }
    }
  };

  const handleOpenLink = () => {
    const url = qrData?.qrCodeUrl || qrData?.accessUrl || qrImageResponse?.data?.data?.accessUrl;
    if (url) {
      window.open(url, '_blank');
    }
  };

  if (qrLoading || qrImageLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-surface rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-content-primary">Loading QR code...</p>
          </div>
        </div>
      </div>
    );
  }

  if ((qrError && !qrData) || (qrImageError && !qrImageUrl)) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-surface rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-content-primary">QR Code Error</h2>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-center py-4">
            <p className="text-content-secondary mb-4">Failed to load QR code for this table.</p>
            <div className="flex space-x-2">
              <Button onClick={() => { refetchQR(); refetchQRImage(); }} variant="outline" className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button onClick={onClose} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header with Tabsy Branding */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-white rounded-t-lg relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-teal-50 via-violet-50 to-teal-50"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-16 translate-x-16"></div>

          <div className="flex items-center space-x-3 relative z-10">
            <div className="p-2 bg-primary rounded-lg">
              <QrCode className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary">
                Table {table.tableNumber} QR Code
              </h2>
              <p className="text-sm text-content-secondary">
                Powered by Tabsy • Digital Menu Experience
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="relative z-10 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Branded QR Code Display */}
          <div className="text-center">
            <div className="bg-white p-8 rounded-xl border-2 border-primary shadow-lg inline-block relative overflow-hidden">
              {/* Tabsy Watermark */}
              <div className="absolute top-3 left-3 flex items-center space-x-2 opacity-60">
                <NextImage
                  src="/tabsy_logo.svg"
                  alt="Tabsy"
                  width={64}
                  height={16}
                  className="h-4 w-auto"
                />
              </div>

              {/* QR Code */}
              <div className="w-64 h-64 flex items-center justify-center rounded-lg bg-gradient-to-br from-teal-50 to-violet-50 border border-primary/20">
                {qrImageUrl ? (
                  <NextImage
                    src={qrImageUrl}
                    alt={`QR Code for Table ${table.tableNumber}`}
                    width={256}
                    height={256}
                    className="w-full h-full object-contain rounded-lg"
                    onLoad={() => logger.debug('QR image loaded successfully')}
                    onError={(e) => logger.error('QR image failed to load', e)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-teal-50 to-violet-50 border-2 border-dashed border-primary/30 flex items-center justify-center rounded-lg">
                    <div className="text-center">
                      {qrImageLoading ? (
                        <Loader2 className="w-16 h-16 mx-auto mb-2 text-primary animate-spin" />
                      ) : (
                        <QrCode className="w-16 h-16 mx-auto mb-2 text-primary" />
                      )}
                      <p className="text-sm text-primary font-medium">
                        {qrImageLoading ? 'Loading QR Code...' : 'QR Code Preview'}
                      </p>
                      <p className="text-xs text-primary/70 mt-1">Table {table.tableNumber}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Table Info Banner */}
              <div className="absolute bottom-3 left-3 right-3 bg-gradient-primary text-primary-foreground px-3 py-1.5 rounded-lg">
                <p className="text-xs font-semibold text-center">Table {table.tableNumber} • Tabsy Menu</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-sm text-content-primary font-medium">
                🍽️ Scan to Access Digital Menu
              </p>
              <p className="text-xs text-content-secondary">
                Powered by Tabsy • Seamless Dining Experience
              </p>
            </div>
          </div>

          {/* QR Code URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-content-primary">QR Code URL</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={qrData?.qrCodeUrl || qrData?.accessUrl || qrImageResponse?.data?.data?.accessUrl || ''}
                readOnly
                className="flex-1 px-3 py-2 bg-surface-secondary border border-default rounded-lg text-content-primary text-sm"
              />
              <Button
                onClick={handleCopyUrl}
                variant="outline"
                size="sm"
                className="flex-shrink-0"
              >
                {copiedUrl ? (
                  <CheckCircle className="w-4 h-4 text-status-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Table Information */}
          <div className="bg-surface-secondary p-4 rounded-lg border border-default">
            <h3 className="font-medium text-content-primary mb-2">Table Information</h3>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-content-secondary">Table Number:</span>
                  <p className="font-medium text-content-primary">{table.tableNumber}</p>
                </div>
                <div>
                  <span className="text-content-secondary">Capacity:</span>
                  <p className="font-medium text-content-primary">{table.capacity} seats</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-content-secondary">Status:</span>
                  <p className="font-medium text-content-primary">{table.status}</p>
                </div>
                <div>
                  <span className="text-content-secondary">Shape:</span>
                  <p className="font-medium text-content-primary">{table.shape}</p>
                </div>
              </div>
              <div>
                <span className="text-content-secondary">QR Code:</span>
                <p className="font-medium text-content-primary break-all font-mono text-xs bg-surface p-2 rounded border">{qrData?.qrCode || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleDownloadQR}
                disabled={isDownloading}
                variant="outline"
                className="flex-1"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </>
                )}
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                className="flex-1"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleOpenLink}
                variant="outline"
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Link
              </Button>
              <Button
                onClick={() => { refetchQR(); refetchQRImage(); }}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Tabsy Instructions */}
          <div className="bg-gradient-to-r from-teal-50 via-violet-50 to-teal-50 border-2 border-primary/20 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full -translate-y-10 translate-x-10"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-secondary/10 rounded-full translate-y-8 -translate-x-8"></div>

            <div className="relative">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-gradient-primary rounded-lg mr-3">
                  <Share2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-primary text-lg">
                    Tabsy QR Experience
                  </h3>
                  <p className="text-xs text-content-secondary">
                    Revolutionizing restaurant dining
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">1</div>
                  <div>
                    <p className="text-sm font-medium text-content-primary">Print & Place</p>
                    <p className="text-xs text-content-secondary">Position the QR code prominently on your table</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground text-xs font-bold">2</div>
                  <div>
                    <p className="text-sm font-medium text-content-primary">Customer Scans</p>
                    <p className="text-xs text-content-secondary">Guests use their phone camera to scan instantly</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center text-accent-foreground text-xs font-bold">3</div>
                  <div>
                    <p className="text-sm font-medium text-content-primary">Digital Menu</p>
                    <p className="text-xs text-content-secondary">Access your full menu with descriptions & pricing</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-status-success rounded-full flex items-center justify-center text-white text-xs font-bold">4</div>
                  <div>
                    <p className="text-sm font-medium text-content-primary">Order & Pay</p>
                    <p className="text-xs text-content-secondary">Seamless ordering and payment experience</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-white/60 rounded-lg border border-primary/20">
                <p className="text-xs text-center text-content-secondary">
                  <span className="font-semibold text-primary">✨ Powered by Tabsy</span> •
                  Contactless • Fast • Secure
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}