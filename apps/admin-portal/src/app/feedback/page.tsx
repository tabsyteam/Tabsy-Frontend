'use client'

import { AdminFeedbackViewer } from '@/components/feedback/FeedbackModeration'

// Disable static generation for this page since it requires API context
export const dynamic = 'force-dynamic'

export default function FeedbackPage() {
  return (
    <div className="container mx-auto p-6">
      <AdminFeedbackViewer />
    </div>
  )
}