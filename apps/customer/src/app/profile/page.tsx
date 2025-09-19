import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Tabsy',
  description: 'QR code restaurant ordering',
}

export default function ProfilePage(): never {
  // Profile has been replaced with Table tab
  // Redirect to table page instead
  redirect('/table')
}