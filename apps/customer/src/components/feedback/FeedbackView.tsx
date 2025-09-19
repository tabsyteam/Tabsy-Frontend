'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@tabsy/ui-components'
import {
  ArrowLeft,
  Star,
  MessageCircle,
  Camera,
  Send,
  Heart,
  Utensils,
  Clock,
  DollarSign,
  Users,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Meh,
  X,
  Image,
  Upload
} from 'lucide-react'
import { toast } from 'sonner'
import { FeedbackFormSkeleton, HeaderSkeleton } from '../ui/Skeleton'
import { haptics } from '@/lib/haptics'
import { useApi } from '@/components/providers/api-provider'

interface FeedbackCategory {
  id: string
  name: string
  icon: React.ElementType
  rating: number
}

interface QuickFeedback {
  id: string
  label: string
  icon: React.ElementType
  type: 'positive' | 'neutral' | 'negative'
}

interface UploadedPhoto {
  id: string
  file: File
  preview: string
  uploading?: boolean
}

export function FeedbackView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { api } = useApi()

  const [overallRating, setOverallRating] = useState<number>(0)
  const [categories, setCategories] = useState<FeedbackCategory[]>([
    { id: 'food', name: 'Food Quality', icon: Utensils, rating: 0 },
    { id: 'service', name: 'Service', icon: Users, rating: 0 },
    { id: 'speed', name: 'Speed', icon: Clock, rating: 0 },
    { id: 'value', name: 'Value for Money', icon: DollarSign, rating: 0 }
  ])
  const [selectedQuickFeedback, setSelectedQuickFeedback] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [loading, setLoading] = useState(true)

  const orderId = searchParams.get('order')
  const restaurantId = searchParams.get('restaurant')
  const tableId = searchParams.get('table')

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  const quickFeedbackOptions: QuickFeedback[] = [
    { id: 'delicious', label: 'Delicious food', icon: Heart, type: 'positive' },
    { id: 'friendly', label: 'Friendly staff', icon: ThumbsUp, type: 'positive' },
    { id: 'fast', label: 'Quick service', icon: Clock, type: 'positive' },
    { id: 'clean', label: 'Clean environment', icon: CheckCircle, type: 'positive' },
    { id: 'slow', label: 'Slow service', icon: Clock, type: 'negative' },
    { id: 'cold', label: 'Food was cold', icon: ThumbsDown, type: 'negative' },
    { id: 'expensive', label: 'Too expensive', icon: DollarSign, type: 'negative' },
    { id: 'average', label: 'Just okay', icon: Meh, type: 'neutral' }
  ]

  const updateCategoryRating = (categoryId: string, rating: number) => {
    haptics.selectItem()
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId ? { ...cat, rating } : cat
      )
    )
  }

  const toggleQuickFeedback = (optionId: string) => {
    haptics.toggle()
    setSelectedQuickFeedback(prev =>
      prev.includes(optionId)
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    )
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const maxPhotos = 5
    const maxFileSize = 5 * 1024 * 1024 // 5MB

    setUploadingPhotos(true)

    try {
      for (let i = 0; i < files.length && photos.length + i < maxPhotos; i++) {
        const file = files[i]
        if (!file) continue

        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not a valid image file`)
          continue
        }

        // Validate file size
        if (file.size > maxFileSize) {
          toast.error(`${file.name} is too large (max 5MB)`)
          continue
        }

        // Create preview
        const preview = URL.createObjectURL(file)
        const photoId = `photo-${Date.now()}-${i}`

        const newPhoto: UploadedPhoto = {
          id: photoId,
          file,
          preview,
          uploading: true
        }

        setPhotos(prev => [...prev, newPhoto])

        // Upload to server using the feedback API
        try {
          const uploadResponse = await api.feedback.uploadPhotos([file])
          if (uploadResponse.success && uploadResponse.data && uploadResponse.data.length > 0) {
            const uploadedPhoto = uploadResponse.data[0]
            if (uploadedPhoto) {
              setPhotos(prev =>
                prev.map(photo =>
                  photo.id === photoId
                    ? { ...photo, uploading: false, id: uploadedPhoto.id }
                    : photo
                )
              )
            } else {
              throw new Error('No photo data received')
            }
          } else {
            throw new Error('Upload failed')
          }
        } catch (uploadError) {
          console.error('Photo upload failed:', uploadError)
          setPhotos(prev => prev.filter(p => p.id !== photoId))
          toast.error(`Failed to upload ${file.name}`)
        }
      }

      toast.success(`${Math.min(files.length, maxPhotos - photos.length)} photo(s) added`)
    } catch (error) {
      console.error('Error uploading photos:', error)
      toast.error('Failed to upload photos')
    } finally {
      setUploadingPhotos(false)
      // Reset the input
      event.target.value = ''
    }
  }

  const removePhoto = async (photoId: string) => {
    const photoToRemove = photos.find(p => p.id === photoId)
    if (!photoToRemove) return

    try {
      // Delete from server if it was uploaded
      if (!photoToRemove.uploading) {
        await api.feedback.deletePhoto(photoId)
      }

      // Remove from local state
      setPhotos(prev => {
        URL.revokeObjectURL(photoToRemove.preview)
        return prev.filter(p => p.id !== photoId)
      })
    } catch (error) {
      console.error('Failed to delete photo:', error)
      toast.error('Failed to delete photo')
    }
  }

  // Cleanup photo URLs on unmount
  useEffect(() => {
    return () => {
      photos.forEach(photo => {
        URL.revokeObjectURL(photo.preview)
      })
    }
  }, [photos])

  const handleSubmit = async () => {
    if (overallRating === 0) {
      haptics.error()
      toast.error('Please provide an overall rating')
      return
    }

    haptics.formSubmit()
    setSubmitting(true)

    try {
      if (!restaurantId) {
        throw new Error('Restaurant ID is required')
      }

      const feedbackData = {
        orderId: orderId || undefined,
        restaurantId,
        tableId: tableId || undefined,
        overallRating,
        categories: categories.reduce((acc, cat) => ({
          ...acc,
          [cat.id]: cat.rating
        }), {}),
        quickFeedback: selectedQuickFeedback,
        comment: comment.trim() || undefined,
        photos: photos.filter(p => !p.uploading).map(photo => ({
          id: photo.id,
          filename: photo.file.name,
          size: photo.file.size,
          type: photo.file.type
        }))
      }

      console.log('Submitting feedback:', feedbackData)

      const response = await api.feedback.create(feedbackData)

      if (response.success) {
        setSubmitted(true)
        toast.success('Thank you for your feedback!', {
          description: 'Your review helps us improve our service',
          duration: 4000,
          icon: '🌟'
        })

        // Navigate back after a delay
        setTimeout(() => {
          router.push('/')
        }, 3000)
      } else {
        const errorMessage = response.error
          ? (typeof response.error === 'string'
              ? response.error
              : (response.error as any)?.message || 'Failed to submit feedback')
          : 'Failed to submit feedback'
        throw new Error(errorMessage)
      }

    } catch (error) {
      console.error('Failed to submit feedback:', error)
      haptics.error()
      toast.error('Failed to submit feedback', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const renderStarRating = (rating: number, onRate: (rating: number) => void, size: 'sm' | 'lg' = 'sm') => {
    const starSize = size === 'lg' ? 'w-8 h-8' : 'w-5 h-5'

    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => {
              haptics.selectItem()
              onRate(star)
            }}
            className={`${starSize} transition-colors ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300 hover:text-yellow-200'
            }`}
            disabled={submitting || submitted}
          >
            <Star className="w-full h-full" />
          </button>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <HeaderSkeleton />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <FeedbackFormSkeleton />
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="text-center space-y-6 max-w-md"
        >
          <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-2xl font-bold text-content-primary mb-2">
              Thank You!
            </h1>
            <p className="text-content-secondary">
              Your feedback has been submitted successfully. We appreciate you taking the time to share your experience with us.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-sm text-content-tertiary"
          >
            Redirecting you back to home...
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-surface shadow-sm border-b sticky top-0 z-10 backdrop-blur-sm bg-surface/95">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="p-2"
              disabled={submitting}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Share Your Experience</h1>
              <p className="text-sm text-content-tertiary">
                Help us improve our service
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Overall Rating */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-xl border p-6 text-center"
        >
          <h3 className="text-lg font-semibold text-content-primary mb-4">
            How was your overall experience?
          </h3>

          <div className="flex justify-center mb-4">
            {renderStarRating(overallRating, setOverallRating, 'lg')}
          </div>

          <p className="text-sm text-content-secondary">
            {overallRating === 0 && 'Tap to rate your experience'}
            {overallRating === 1 && 'Poor - We can do much better'}
            {overallRating === 2 && 'Fair - Room for improvement'}
            {overallRating === 3 && 'Good - We appreciate your feedback'}
            {overallRating === 4 && 'Very Good - Thank you!'}
            {overallRating === 5 && 'Excellent - We\'re thrilled!'}
          </p>
        </motion.div>

        {/* Category Ratings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface rounded-xl border p-6"
        >
          <h3 className="text-lg font-semibold text-content-primary mb-4">
            Rate Each Category
          </h3>

          <div className="space-y-4">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <category.icon className="w-5 h-5 text-content-secondary" />
                  <span className="font-medium text-content-primary">
                    {category.name}
                  </span>
                </div>
                {renderStarRating(category.rating, (rating) => updateCategoryRating(category.id, rating))}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Feedback */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface rounded-xl border p-6"
        >
          <h3 className="text-lg font-semibold text-content-primary mb-4">
            Quick Feedback
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {quickFeedbackOptions.map((option) => (
              <Button
                key={option.id}
                variant={selectedQuickFeedback.includes(option.id) ? 'default' : 'outline'}
                onClick={() => toggleQuickFeedback(option.id)}
                className={`h-auto py-3 px-4 text-left flex items-center space-x-2 ${
                  option.type === 'positive' && selectedQuickFeedback.includes(option.id)
                    ? 'bg-green-600 hover:bg-green-700'
                    : option.type === 'negative' && selectedQuickFeedback.includes(option.id)
                    ? 'bg-red-600 hover:bg-red-700'
                    : ''
                }`}
                disabled={submitting}
              >
                <option.icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{option.label}</span>
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Written Feedback */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-surface rounded-xl border p-6"
        >
          <h3 className="text-lg font-semibold text-content-primary mb-4 flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <span>Tell Us More (Optional)</span>
          </h3>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share any additional thoughts about your experience..."
            className="w-full p-4 border border-border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
            rows={4}
            maxLength={500}
            disabled={submitting}
          />

          <div className="flex justify-between items-center mt-2">
            <div className="text-xs text-content-tertiary">
              {comment.length}/500 characters
            </div>

            <div className="relative">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={submitting || uploadingPhotos || photos.length >= 5}
              />
              <Button
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
                disabled={submitting || uploadingPhotos || photos.length >= 5}
              >
                {uploadingPhotos ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Add Photo</span>
                    {photos.length > 0 && (
                      <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                        {photos.length}
                      </span>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Photo Gallery */}
          {photos.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-content-primary flex items-center space-x-2">
                  <Image className="w-4 h-4" />
                  <span>Photos ({photos.length}/5)</span>
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    photos.forEach(photo => URL.revokeObjectURL(photo.preview))
                    setPhotos([])
                  }}
                  className="text-xs"
                  disabled={submitting}
                >
                  Remove All
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((photo) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100"
                  >
                    <img
                      src={photo.preview}
                      alt="Feedback photo"
                      className="w-full h-full object-cover"
                    />

                    {photo.uploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="flex flex-col items-center space-y-2 text-white">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                          <span className="text-xs">Uploading...</span>
                        </div>
                      </div>
                    )}

                    {!photo.uploading && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePhoto(photo.id)}
                        className="absolute top-1 right-1 w-6 h-6 p-0 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={submitting}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}

                    <div className="absolute bottom-1 left-1 right-1">
                      <div className="text-xs text-white bg-black/50 rounded px-1 py-0.5 truncate">
                        {photo.file.name}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="text-xs text-content-tertiary">
                Maximum 5 photos, up to 5MB each. JPG, PNG formats supported.
              </div>
            </div>
          )}
        </motion.div>

        {/* Submit Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={handleSubmit}
            size="lg"
            className="w-full"
            disabled={submitting || overallRating === 0}
          >
            {submitting ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Submitting...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Send className="w-4 h-4" />
                <span>Submit Feedback</span>
              </div>
            )}
          </Button>

          <p className="text-xs text-content-tertiary text-center mt-3">
            Your feedback is anonymous and helps us improve our service
          </p>
        </motion.div>
      </div>
    </div>
  )
}