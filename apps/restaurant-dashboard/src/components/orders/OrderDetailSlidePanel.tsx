'use client';

import { useState, useEffect } from 'react';
import { Button } from '@tabsy/ui-components';
import {
  X,
  Clock,
  User,
  MapPin,
  FileText,
  DollarSign,
  ChefHat,
  CheckCircle2,
  ArrowRight,
  Printer,
  Receipt,
} from 'lucide-react';
import { Order, OrderStatus, OrderItem } from '@tabsy/shared-types';
import { format } from 'date-fns';
import { CustomizationList } from '@tabsy/ui-components';
import { parseCustomizations, formatPriceModifier } from '@tabsy/shared-utils';
import { OrderStatusFlow } from './OrderStatusFlow';

interface OrderDetailSlidePanelProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (orderId: string, status: OrderStatus) => void;
}

export function OrderDetailSlidePanel({
  order,
  isOpen,
  onClose,
  onStatusUpdate,
}: OrderDetailSlidePanelProps) {
  const [updating, setUpdating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // Prevent body scroll when panel is open
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable body scroll when panel is closed
      document.body.style.overflow = 'unset';
      // Delay unmounting to allow exit animation
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    if (!order) return;

    setUpdating(true);
    try {
      await onStatusUpdate(order.id, newStatus);
    } catch (err) {
      console.error('Failed to update order status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    switch (currentStatus) {
      case OrderStatus.RECEIVED:
        return OrderStatus.PREPARING;
      case OrderStatus.PREPARING:
        return OrderStatus.READY;
      case OrderStatus.READY:
        return OrderStatus.DELIVERED;
      case OrderStatus.DELIVERED:
        return OrderStatus.COMPLETED;
      default:
        return null;
    }
  };

  const getNextStatusText = (currentStatus: OrderStatus): string => {
    const nextStatus = getNextStatus(currentStatus);
    if (!nextStatus) return '';

    switch (nextStatus) {
      case OrderStatus.PREPARING:
        return 'Start Preparing';
      case OrderStatus.READY:
        return 'Mark Ready';
      case OrderStatus.DELIVERED:
        return 'Mark Delivered';
      case OrderStatus.COMPLETED:
        return 'Complete Order';
      default:
        return '';
    }
  };

  const canUpdateStatus = (status: OrderStatus): boolean => {
    if (!status) return false;
    return ![OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(status);
  };

  const canCancelOrder = (status: OrderStatus): boolean => {
    if (!status) return false;
    return [OrderStatus.RECEIVED, OrderStatus.PREPARING].includes(status);
  };

  const getStatusProgress = (status: OrderStatus): number => {
    switch (status) {
      case OrderStatus.RECEIVED:
        return 20;
      case OrderStatus.PREPARING:
        return 40;
      case OrderStatus.READY:
        return 60;
      case OrderStatus.DELIVERED:
        return 80;
      case OrderStatus.COMPLETED:
        return 100;
      default:
        return 0;
    }
  };

  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case OrderStatus.RECEIVED:
        return 'text-primary bg-primary/10';
      case OrderStatus.PREPARING:
        return 'text-status-warning bg-status-warning-light';
      case OrderStatus.READY:
        return 'text-status-success bg-status-success-light';
      case OrderStatus.DELIVERED:
        return 'text-secondary bg-secondary/10';
      case OrderStatus.COMPLETED:
        return 'text-muted-foreground bg-muted';
      case OrderStatus.CANCELLED:
        return 'text-destructive bg-destructive/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const handlePrint = (type: 'kitchen' | 'customer') => {
    if (!order) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('Failed to open print window');
      return;
    }

    const isKitchen = type === 'kitchen';
    const title = isKitchen ? `Kitchen Ticket - Order #${order.orderNumber}` : `Receipt - Order #${order.orderNumber}`;

    // Generate customizations HTML using the robust parseCustomizations utility
    const generateCustomizationsHTML = (item: OrderItem) => {
      const customizations = item.options || item.selectedOptions || (item as any).options;
      if (!customizations) {
        return '';
      }

      // Use the same parseCustomizations utility that CustomizationList uses
      const parsed = parseCustomizations(customizations);

      if (parsed.details.length === 0) {
        return '';
      }

      // Generate HTML for each customization option
      const customizationHTML = parsed.details.map(option => {
        const values = option.selectedValues.map(value => {
          const priceText = !isKitchen && value.priceModifier
            ? ` (${formatPriceModifier(value.priceModifier)})`
            : '';
          return `${value.name}${priceText}`;
        }).join(', ');

        return `<div class="customization-item"><strong>${option.optionName}:</strong> ${values}</div>`;
      }).join('');

      return `
        <div class="customizations">
          <strong>🔧 Customizations:</strong>
          ${customizationHTML}
          ${!isKitchen && parsed.totalPriceModifier !== 0 ? `
            <div class="customization-total">
              <strong>Total Customization: ${formatPriceModifier(parsed.totalPriceModifier)}</strong>
            </div>
          ` : ''}
        </div>
      `;
    };

    // Generate order items HTML
    const itemsHTML = order.items.map((item: OrderItem) => `
      <div class="order-item">
        <div class="item-header">
          <span class="item-quantity">${item.quantity}x</span>
          <span class="item-name">${item.menuItem?.name || (item as any).name || 'Unknown Item'}</span>
          ${!isKitchen ? `<span class="item-price">$${parseFloat(String(item.subtotal || 0)).toFixed(2)}</span>` : ''}
        </div>
        ${item.menuItem?.description ? `<div class="item-description">${item.menuItem.description}</div>` : ''}
        ${generateCustomizationsHTML(item)}
        ${item.specialInstructions ? `
          <div class="special-instructions">
            <strong>⚠️ Special Instructions:</strong> ${item.specialInstructions}
          </div>
        ` : ''}
      </div>
    `).join('');

    // Generate pricing section (customer only)
    const pricingHTML = !isKitchen ? `
      <div class="pricing-section">
        <h3>Order Summary</h3>
        <div class="price-line">
          <span>Subtotal:</span>
          <span>$${parseFloat(String(order.subtotal || 0)).toFixed(2)}</span>
        </div>
        ${parseFloat(String(order.tax || '0')) > 0 ? `
          <div class="price-line">
            <span>Tax:</span>
            <span>$${parseFloat(String(order.tax || 0)).toFixed(2)}</span>
          </div>
        ` : ''}
        ${(order.serviceChargeAmount || 0) > 0 ? `
          <div class="price-line">
            <span>Service Charge:</span>
            <span>$${(order.serviceChargeAmount || 0).toFixed(2)}</span>
          </div>
        ` : ''}
        ${parseFloat(String(order.tip || '0')) > 0 ? `
          <div class="price-line">
            <span>Tip:</span>
            <span>$${parseFloat(String(order.tip || 0)).toFixed(2)}</span>
          </div>
        ` : ''}
        ${(order.discountAmount || 0) > 0 ? `
          <div class="price-line discount">
            <span>Discount:</span>
            <span>-$${(order.discountAmount || 0).toFixed(2)}</span>
          </div>
        ` : ''}
        <div class="price-line total">
          <span>TOTAL:</span>
          <span>$${parseFloat(String(order?.total || '0')).toFixed(2)}</span>
        </div>
      </div>
    ` : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
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
            }

            body {
              font-family: 'Courier New', monospace;
              margin: 0;
              padding: 20px;
              background: white;
              color: black;
              font-size: 12px;
              line-height: 1.4;
            }

            .print-container {
              max-width: 600px;
              margin: 0 auto;
            }

            .header {
              text-align: center;
              border-bottom: 2px solid black;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }

            .restaurant-name {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 5px;
            }

            .ticket-type {
              font-size: 16px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 1px;
              ${isKitchen ? 'background: black; color: white; padding: 5px 10px;' : ''}
            }

            .order-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 1px solid black;
            }

            .info-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }

            .info-label {
              font-weight: bold;
            }

            ${isKitchen ? `
              .kitchen-alert {
                background: black;
                color: white;
                padding: 10px;
                text-align: center;
                font-weight: bold;
                margin-bottom: 15px;
                font-size: 14px;
              }

              .prep-time {
                font-size: 16px;
                font-weight: bold;
                text-align: center;
                background: #F1F5F9;
                padding: 10px;
                margin: 15px 0;
                border: 2px solid black;
              }
            ` : ''}

            .items-section {
              margin-bottom: 20px;
            }

            .section-title {
              font-size: 14px;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 15px;
              border-bottom: 1px solid black;
              padding-bottom: 5px;
            }

            .order-item {
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 1px dashed #CBD5E1;
            }

            .item-header {
              display: flex;
              align-items: center;
              font-weight: bold;
              font-size: 13px;
              margin-bottom: 5px;
              gap: 10px;
            }

            .item-quantity {
              background: black;
              color: white;
              padding: 3px 8px;
              border-radius: 3px;
              font-weight: bold;
              min-width: 30px;
              text-align: center;
            }

            .item-name {
              flex: 1;
            }

            .item-price {
              font-weight: bold;
              margin-left: auto;
            }

            .item-description {
              font-size: 11px;
              color: #64748B;
              margin: 3px 0 3px 45px;
              font-style: italic;
            }

            .customizations {
              margin: 8px 0 8px 45px;
              font-size: 11px;
              line-height: 1.3;
              background: #F8FAFC;
              padding: 5px;
              border-left: 3px solid #334155;
            }

            .customization-item {
              margin-bottom: 3px;
            }

            .customization-total {
              margin-top: 5px;
              padding-top: 3px;
              border-top: 1px dashed #64748B;
              font-size: 11px;
            }

            .special-instructions {
              background: #FFFBEB;
              padding: 8px;
              margin: 8px 0 8px 45px;
              border-left: 4px solid #FBBF24;
              font-size: 11px;
            }

            .pricing-section {
              margin-top: 20px;
              padding-top: 15px;
              border-top: 2px solid black;
            }

            .pricing-section h3 {
              font-size: 14px;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 10px;
            }

            .price-line {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
              font-size: 12px;
            }

            .price-line.discount {
              color: green;
            }

            .price-line.total {
              font-weight: bold;
              font-size: 14px;
              border-top: 1px solid black;
              padding-top: 8px;
              margin-top: 8px;
            }

            .footer {
              margin-top: 25px;
              text-align: center;
              font-size: 10px;
              color: #64748B;
              border-top: 1px solid #CBD5E1;
              padding-top: 15px;
            }

            .powered-by {
              margin-top: 10px;
              font-size: 11px;
              font-weight: bold;
              color: #0D9488;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <!-- Header -->
            <div class="header">
              <div class="restaurant-name">Tabsy Restaurant</div>
              <div class="ticket-type">${isKitchen ? 'Kitchen Ticket' : 'Order Receipt'}</div>
            </div>

            ${isKitchen && order.status === 'RECEIVED' ? `
              <div class="kitchen-alert">
                🔥 NEW ORDER - PREPARE IMMEDIATELY 🔥
              </div>
            ` : ''}

            <!-- Order Information -->
            <div class="order-info">
              <div class="info-item">
                <span class="info-label">Order #:</span>
                <span>${order.orderNumber}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Table:</span>
                <span>${order.tableId ? `Table ${order.tableId.slice(-2)}` : 'No Table'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Status:</span>
                <span>${order.status?.replace('_', ' ')}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Guest:</span>
                <span>${order.customerName || 'Guest User'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Order Time:</span>
                <span>${format(new Date(order.createdAt), 'MMM dd, yyyy - HH:mm')}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Print Time:</span>
                <span>${format(new Date(), 'MMM dd, yyyy - HH:mm:ss')}</span>
              </div>
            </div>

            ${isKitchen && order.estimatedPreparationTime ? `
              <div class="prep-time">
                ⏱️ Estimated Prep Time: ${order.estimatedPreparationTime} minutes
              </div>
            ` : ''}

            <!-- Order Items -->
            <div class="items-section">
              <div class="section-title">Order Items (${order.items.length})</div>
              ${itemsHTML}
            </div>

            <!-- Order Special Instructions -->
            ${order.specialInstructions ? `
              <div class="special-instructions" style="margin-left: 0; border-left: 4px solid #FBBF24;">
                <strong>📝 Order Instructions:</strong><br>
                ${order.specialInstructions}
              </div>
            ` : ''}

            ${pricingHTML}

            <!-- Footer -->
            <div class="footer">
              ${isKitchen ? `
                <div>Kitchen Copy - Please Prepare Items As Listed</div>
                <div>Order Status: ${order.status?.replace('_', ' ')} | Printed: ${format(new Date(), 'HH:mm:ss')}</div>
              ` : `
                <div>Thank you for your order!</div>
                <div>Order placed: ${format(new Date(order.createdAt), 'PPpp')}</div>
              `}
              <div class="powered-by">Powered by Tabsy | Seamless Dining Experience</div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    // Wait a moment for content to render before printing
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  if (!mounted || !order) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-lg bg-background shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Order #{order.orderNumber}</h2>
              <p className="text-primary-foreground/80 text-sm">
                {format(new Date(order.createdAt), 'PPpp')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Print Buttons */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePrint('kitchen')}
                className="text-primary-foreground hover:bg-primary-foreground/20 h-8 px-2"
                title="Print Kitchen Ticket"
              >
                <ChefHat className="h-4 w-4 mr-1" />
                <span className="text-xs">Kitchen</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePrint('customer')}
                className="text-primary-foreground hover:bg-primary-foreground/20 h-8 px-2"
                title="Print Customer Receipt"
              >
                <Receipt className="h-4 w-4 mr-1" />
                <span className="text-xs">Receipt</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Status Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span
                className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(order.status)}`}
              >
                {order.status?.replace('_', ' ') || 'UNKNOWN'}
              </span>
              <span className="text-primary-foreground/80 text-sm">
                {getStatusProgress(order.status)}% Complete
              </span>
            </div>
            <div className="w-full bg-primary-foreground/20 rounded-full h-2">
              <div
                className="bg-primary-foreground rounded-full h-2 transition-all duration-500 ease-out"
                style={{ width: `${getStatusProgress(order.status)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content - Now with proper flexbox layout */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick Info Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 border">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground/80">Table</p>
                  <p className="font-semibold text-sm text-foreground">
                    {order.tableId ? `Table ${order.tableId.slice(-2)}` : 'No Table'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 border">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground/80">Total</p>
                  <p className="font-semibold text-lg text-foreground">
                    ${parseFloat(String(order.total || 0)).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 border">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground/80">ETA</p>
                  <p className="font-semibold text-sm text-foreground">
                    {order.estimatedPreparationTime || 'N/A'} min
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 border">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground/80">Guest</p>
                  <p className="font-semibold text-sm text-foreground">
                    {order.customerName || 'Guest User'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Status Flow */}
          <OrderStatusFlow
            currentStatus={order.status}
            onStatusUpdate={(newStatus) => handleStatusUpdate(newStatus)}
            disabled={updating || !canUpdateStatus(order.status)}
          />

          {/* Special Instructions */}
          {order.specialInstructions && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <FileText className="h-4 w-4 text-warning-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-warning-foreground mb-1">
                    Special Instructions
                  </p>
                  <p className="text-sm text-foreground">{order.specialInstructions}</p>
                </div>
              </div>
            </div>
          )}

          {/* Order Items */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <ChefHat className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Order Items</h3>
            </div>

            <div className="space-y-3">
              {order.items.map((item: OrderItem, index) => (
                <div key={item.id} className="bg-card border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">
                        {item.quantity}x {item.menuItem?.name || (item as any).name || 'Unknown Item'}
                      </h4>
                      <p className="text-sm text-foreground/80 mt-1">{item.menuItem?.description || ''}</p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="font-semibold text-foreground">
                        ${parseFloat(String(item.subtotal || 0)).toFixed(2)}
                      </p>
                      <p className="text-xs text-foreground/70">
                        ${parseFloat(String(item.price || 0)).toFixed(2)} each
                      </p>
                    </div>
                  </div>

                  {/* Customizations */}
                  {((item.options && item.options.length > 0) ||
                    (item.selectedOptions && item.selectedOptions.length > 0) ||
                    ((item as any).options)) && (
                    <div className="mt-2 p-2 bg-muted/50 rounded border-l-2 border-primary/20">
                      <p className="text-xs font-medium text-foreground/90 mb-1">Customizations:</p>
                      <CustomizationList
                        customizations={item.options || item.selectedOptions || (item as any).options}
                        compact={true}
                        showPrices={true}
                        className="text-xs text-foreground/80"
                      />
                    </div>
                  )}

                  {/* Item Special Instructions */}
                  {item.specialInstructions && (
                    <div className="mt-2 p-2 bg-primary/5 rounded border-l-2 border-primary/20">
                      <p className="text-xs font-medium text-primary">Special Notes:</p>
                      <p className="text-xs text-foreground">{item.specialInstructions}</p>
                    </div>
                  )}

                  {/* Item Status */}
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${
                        (item.status || 'PENDING') === 'READY'
                          ? 'bg-success/10 text-success-foreground'
                          : (item.status || 'PENDING') === 'PREPARING'
                            ? 'bg-warning/10 text-warning-foreground'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {(item.status || 'PENDING').replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-muted/50 rounded-lg p-4 border">
            <h3 className="text-lg font-semibold text-foreground mb-3">Order Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground/80">Subtotal:</span>
                <span className="font-medium">
                  ${parseFloat(String(order.subtotal || 0)).toFixed(2)}
                </span>
              </div>
              {parseFloat(String(order.tax || '0')) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-foreground/80">Tax:</span>
                  <span className="font-medium">
                    ${parseFloat(String(order.tax || 0)).toFixed(2)}
                  </span>
                </div>
              )}
              {(order.serviceChargeAmount || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-foreground/80">Service Charge:</span>
                  <span className="font-medium">
                    ${(order.serviceChargeAmount || 0).toFixed(2)}
                  </span>
                </div>
              )}
              {parseFloat(String(order.tip || '0')) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-foreground/80">Tip:</span>
                  <span className="font-medium">
                    ${parseFloat(String(order.tip || 0)).toFixed(2)}
                  </span>
                </div>
              )}
              {(order.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Discount:</span>
                  <span className="font-medium">-${(order.discountAmount || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total:</span>
                <span>${parseFloat(String(order?.total || '0')).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t bg-background p-4 flex-shrink-0">
          {/* Print Actions Row */}
          <div className="flex gap-2 mb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrint('kitchen')}
              className="flex-1"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Kitchen Ticket
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrint('customer')}
              className="flex-1"
            >
              <Receipt className="w-4 h-4 mr-2" />
              Print Customer Receipt
            </Button>
          </div>

          {/* Status Actions Row */}
          <div className="flex gap-2">
            {canCancelOrder(order.status) && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleStatusUpdate(OrderStatus.CANCELLED)}
                disabled={updating}
                className="flex-1"
              >
                Cancel Order
              </Button>
            )}

            {canUpdateStatus(order.status) && getNextStatus(order.status) && (
              <Button
                size="sm"
                onClick={() => handleStatusUpdate(getNextStatus(order.status)!)}
                disabled={updating}
                className="flex-1"
              >
                {updating ? (
                  'Updating...'
                ) : (
                  <>
                    {getNextStatusText(order.status)}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
