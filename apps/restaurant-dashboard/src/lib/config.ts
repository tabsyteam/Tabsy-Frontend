import { z } from 'zod'

// Define environment variable schema
const EnvSchema = z.object({
    NEXT_PUBLIC_WS_BASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_CUSTOMER_APP_URL: z.string().url().optional(),
    NEXT_PUBLIC_ADMIN_APP_URL: z.string().url().optional(),
})

// Parse and validate environment variables
const envVars = {
    NEXT_PUBLIC_WS_BASE_URL: process.env.NEXT_PUBLIC_WS_BASE_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_CUSTOMER_APP_URL: process.env.NEXT_PUBLIC_CUSTOMER_APP_URL,
    NEXT_PUBLIC_ADMIN_APP_URL: process.env.NEXT_PUBLIC_ADMIN_APP_URL,
}

// Validate environment variables
const parseResult = EnvSchema.safeParse(envVars)

if (!parseResult.success) {
    console.error('❌ Invalid environment variables:')
    console.error(parseResult.error.flatten().fieldErrors)
}

// Export config with fallbacks for development
export const config = {
    wsBaseUrl: envVars.NEXT_PUBLIC_WS_BASE_URL || 'ws://localhost:5000',
    apiBaseUrl: envVars.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000',
    customerAppUrl: envVars.NEXT_PUBLIC_CUSTOMER_APP_URL || 'http://localhost:3001',
    adminAppUrl: envVars.NEXT_PUBLIC_ADMIN_APP_URL || 'http://localhost:3003',
} as const

// Validation helper
export function validateRequiredEnvVars(): void {
    const missing: string[] = []

    if (!envVars.NEXT_PUBLIC_WS_BASE_URL) {
        missing.push('NEXT_PUBLIC_WS_BASE_URL')
    }

    if (!envVars.NEXT_PUBLIC_API_BASE_URL) {
        missing.push('NEXT_PUBLIC_API_BASE_URL')
    }

    if (missing.length > 0 && process.env.NODE_ENV === 'production') {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}. ` +
            'Please set them in your .env file or environment.'
        )
    }

    if (missing.length > 0 && process.env.NODE_ENV === 'development') {
        console.warn(
            `⚠️  Missing environment variables: ${missing.join(', ')}. Using defaults for development.`
        )
    }
}

// Validate on module load
validateRequiredEnvVars()