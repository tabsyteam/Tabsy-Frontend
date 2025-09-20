import { OrderStatus } from '@tabsy/shared-types'

/**
 * Interface for extracted order data from WebSocket payloads
 */
export interface ExtractedOrderData {
  orderId: string | null
  status: OrderStatus | null
  previousStatus?: OrderStatus | null
  updatedAt?: string | null
  estimatedTime?: number | null
}

/**
 * Extracts order data from various WebSocket payload formats
 * Handles backend's OrderStatusUpdatedPayload structure and other formats
 */
export function extractOrderDataFromPayload(payload: any): ExtractedOrderData {
  // Handle null/undefined payload
  if (!payload || typeof payload !== 'object') {
    return {
      orderId: null,
      status: null
    }
  }

  // Extract order ID from various possible locations
  const orderId = payload.order?.id || payload.orderId || null

  // Extract status from various possible locations
  const status = payload.order?.status || payload.status || payload.newStatus || null

  // Extract previous status
  const previousStatus = payload.order?.previousStatus || payload.previousStatus || null

  // Extract updated timestamp
  const updatedAt = payload.order?.updatedAt || payload.updatedAt || null

  // Extract estimated time
  const estimatedTime = payload.estimatedTime || payload.order?.estimatedPreparationTime || null

  return {
    orderId,
    status,
    previousStatus,
    updatedAt,
    estimatedTime
  }
}

/**
 * Validates if the extracted order data is valid for processing
 */
export function isValidOrderData(data: ExtractedOrderData): boolean {
  return !!(data.orderId && data.status && data.status !== 'undefined')
}

/**
 * Helper function to log WebSocket payload structure for debugging
 */
export function logPayloadStructure(payload: any, context: string): void {
  console.log(`[${context}] Raw payload structure:`, {
    hasOrder: !!payload?.order,
    hasOrderId: !!payload?.orderId,
    orderKeys: payload?.order ? Object.keys(payload.order) : null,
    directKeys: payload ? Object.keys(payload) : null,
    payloadType: typeof payload
  })
}

/**
 * Helper function to log extracted order data for debugging
 */
export function logExtractedData(data: ExtractedOrderData, context: string): void {
  console.log(`[${context}] Extracted data:`, {
    orderId: data.orderId,
    status: data.status,
    previousStatus: data.previousStatus,
    updatedAt: data.updatedAt,
    estimatedTime: data.estimatedTime,
    isValid: isValidOrderData(data)
  })
}

/**
 * Complete helper function for processing WebSocket order updates
 * Combines extraction, validation, and logging
 */
export function processOrderUpdatePayload(
  payload: any,
  context: string
): ExtractedOrderData | null {
  // Log payload structure for debugging
  logPayloadStructure(payload, context)

  // Extract order data
  const extractedData = extractOrderDataFromPayload(payload)

  // Log extracted data
  logExtractedData(extractedData, context)

  // Validate and return
  if (isValidOrderData(extractedData)) {
    return extractedData
  } else {
    console.warn(`[${context}] Invalid order data extracted from payload:`, payload)
    return null
  }
}