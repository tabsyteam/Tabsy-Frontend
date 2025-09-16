import { Metadata } from 'next'
import { Suspense } from 'react'
import { FeedbackView } from '@/components/feedback/FeedbackView'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export const metadata: Metadata = {
  title: 'Feedback - Tabsy',
  description: 'Share your dining experience with us',
}

export default function FeedbackPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSpinner />}>
        <FeedbackView />
      </Suspense>
    </div>
  )
}