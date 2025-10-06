import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientProviders } from '../components/ClientProviders';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Tabsy Admin Portal",
    template: "%s | Tabsy Admin"
  },
  description: "Admin portal for managing restaurants, users, and platform operations",
  icons: {
    icon: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      }
    ],
    apple: [
      {
        url: '/apple-icon.svg',
        type: 'image/svg+xml',
      }
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'Tabsy Admin Portal',
    description: 'Admin portal for managing restaurants, users, and platform operations',
    siteName: 'Tabsy Admin',
    images: [
      {
        url: '/tabsy_logo.svg',
        width: 1215,
        height: 333,
        alt: 'Tabsy Logo',
      }
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased`}
        suppressHydrationWarning
      >
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
