import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require a valid dining session (these will redirect)
const PROTECTED_ROUTES = [
  '/checkout',
  '/order',
  '/feedback'
]

// Routes that can be accessed without session but show "scan QR" message
const CONDITIONAL_ROUTES = [
  '/menu',
  '/cart',
  '/orders',
  '/table',
  '/search'
]

// Routes that should redirect to menu if user has session
const PUBLIC_ROUTES = [
  '/',
  '/home'
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const url = request.nextUrl.clone()

  // CRITICAL FIX: QR routes with explicit params should ALWAYS be allowed
  // The QR page will handle clearing/updating any mismatched session storage
  // Pattern: /table/[qrCode] with ?r= and ?t= params
  const isQRRoute = pathname.startsWith('/table/') && pathname !== '/table'
  const hasQRParams = request.nextUrl.searchParams.has('r') || request.nextUrl.searchParams.has('restaurant')

  if (isQRRoute && hasQRParams) {
    return NextResponse.next()
  }

  // Check if route needs protection
  const isProtectedRoute = PROTECTED_ROUTES.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

  const isConditionalRoute = CONDITIONAL_ROUTES.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)

  // Get session info from query params or cookies
  // Support both short (r/t) and long (restaurant/table) formats
  const restaurantId = request.nextUrl.searchParams.get('restaurant') ||
                      request.nextUrl.searchParams.get('r')
  const tableId = request.nextUrl.searchParams.get('table') ||
                 request.nextUrl.searchParams.get('t')
  const sessionCookie = request.cookies.get('sessionId')

  // Validate URL parameters
  const hasValidUrlParams = restaurantId && tableId &&
                           restaurantId !== 'null' && tableId !== 'null' &&
                           restaurantId.trim() !== '' && tableId.trim() !== ''

  // Check if user likely has a valid session
  const hasSession = hasValidUrlParams || sessionCookie

  // Handle strictly protected routes (redirect to home)
  if (isProtectedRoute && !hasSession) {
    // Redirect to home to scan QR code
    url.pathname = '/'
    url.search = '' // Clear any invalid parameters
    return NextResponse.redirect(url)
  }

  // Conditional routes are allowed to load - they will show "scan QR" messages internally
  // Don't redirect these routes, let them handle the no-session state themselves

  // Handle public routes when user has session
  if (isPublicRoute && hasSession && hasValidUrlParams) {
    // Redirect to menu page with session params (use long format)
    url.pathname = '/menu'
    url.searchParams.delete('r')
    url.searchParams.delete('t')
    url.searchParams.set('restaurant', restaurantId!)
    url.searchParams.set('table', tableId!)
    return NextResponse.redirect(url)
  }

  // Clean up URLs with null parameters
  if (pathname.includes('null') ||
      restaurantId === 'null' ||
      tableId === 'null') {
    // Remove null parameters and redirect
    if (restaurantId === 'null') {
      url.searchParams.delete('restaurant')
    }
    if (tableId === 'null') {
      url.searchParams.delete('table')
    }

    // If this results in no valid session, redirect to home
    if (!url.searchParams.get('restaurant') && !url.searchParams.get('table')) {
      url.pathname = '/'
      url.search = ''
    }

    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}