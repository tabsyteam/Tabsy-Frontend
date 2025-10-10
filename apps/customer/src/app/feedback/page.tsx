import { Metadata } from 'next'
import { Suspense } from 'react'
import { FeedbackView } from '@/components/feedback/FeedbackView'
import { TabsyLoader } from '@/components/ui/TabsyLoader'

export const metadata: Metadata = {
  title: 'Feedback - Tabsy',
  description: 'Share your dining experience with us',
}

export default function FeedbackPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <TabsyLoader message="Loading Feedback" size="lg" />
        </div>
      }>
        <FeedbackView />
      </Suspense>
    </div>
  )
}