import * as React from 'react'
import { QrCode } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Button } from './button'

interface QrCodeDisplayProps {
  qrCodeUrl: string
  tableNumber?: string | number
  restaurantName?: string
  onRefresh?: () => void
  className?: string
}

export const QrCodeDisplay = React.forwardRef<HTMLDivElement, QrCodeDisplayProps>(
  ({ qrCodeUrl, tableNumber, restaurantName, onRefresh, className }, ref) => {
    return (
      <Card ref={ref} className={className}>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code
            {tableNumber && ` - Table ${tableNumber}`}
          </CardTitle>
          {restaurantName && (
            <p className="text-sm text-muted-foreground">{restaurantName}</p>
          )}
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <img
              src={qrCodeUrl}
              alt="QR Code for table ordering"
              className="w-48 h-48 mx-auto"
            />
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Customers can scan this QR code to view the menu and place orders for this table.
          </p>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              Refresh QR Code
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }
)
QrCodeDisplay.displayName = "QrCodeDisplay"
