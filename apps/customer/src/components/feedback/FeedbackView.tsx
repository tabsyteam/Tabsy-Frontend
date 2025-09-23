'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Upload,
  Loader2,
  AlertCircle,
  Trash2,
  RotateCcw
} from 'lucide-react'
import { toast } from 'sonner'
import { FeedbackFormSkeleton, HeaderSkeleton } from '../ui/Skeleton'
import { haptics } from '@/lib/haptics'
import { useApi } from '@/components/providers/api-provider'
import {
  useCreateFeedback,
  useUploadFeedbackPhotos,
  useDeleteFeedbackPhoto,
  FEEDBACK_KEYS
} from '@tabsy/react-query-hooks'
import { useQueryClient } from '@tanstack/react-query'
import type {
  CreateFeedbackRequest,
  FeedbackPhoto,
  QuickFeedbackOption,
  FeedbackCategoryDefinition,
  DEFAULT_QUICK_FEEDBACK_OPTIONS,
  DEFAULT_FEEDBACK_CATEGORIES
} from '@tabsy/shared-types'

// Enhanced interfaces with production features
interface LocalFeedbackCategory {
  id: string
  name: string
  icon: React.ElementType
  rating: number
}

interface LocalQuickFeedback {
  id: string
  label: string
  icon: React.ElementType
  type: 'positive' | 'neutral' | 'negative'
}

interface LocalUploadedPhoto {
  id: string
  file: File
  preview: string
  uploading?: boolean
  uploaded?: boolean
  error?: string
  progress?: number
}

// Add UploadedPhoto alias for backward compatibility
type UploadedPhoto = LocalUploadedPhoto

interface ValidationErrors {
  overallRating?: string
  comment?: string
  photos?: string
  guestInfo?: {
    email?: string
    phone?: string
  }
}

export function FeedbackView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { api } = useApi()
  const queryClient = useQueryClient()

  // Enhanced state management
  const [overallRating, setOverallRating] = useState<number>(0)
  const [categories, setCategories] = useState<LocalFeedbackCategory[]>([
    { id: 'food', name: 'Food Quality', icon: Utensils, rating: 0 },
    { id: 'service', name: 'Service', icon: Users, rating: 0 },
    { id: 'speed', name: 'Speed', icon: Clock, rating: 0 },
    { id: 'value', name: 'Value for Money', icon: DollarSign, rating: 0 }
  ])
  const [selectedQuickFeedback, setSelectedQuickFeedback] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [photos, setPhotos] = useState<LocalUploadedPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [guestInfo, setGuestInfo] = useState({ name: '', email: '', phone: '' })
  const [showGuestInfo, setShowGuestInfo] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  // URL parameters
  const orderId = searchParams.get('order')
  const restaurantId = searchParams.get('restaurant')
  const tableId = searchParams.get('table')

  // React Query hooks for production data handling
  const createFeedbackMutation = useCreateFeedback(api, {
    onSuccess: (result) => {
      if (result.success) {
        setSubmitted(true)
        setIsDirty(false)
        haptics.success()

        toast.success('Thank you for your feedback!', {
          description: 'Your review helps us improve our service',
          duration: 4000,
          icon: '🌟'
        })

        // Navigate back after delay
        setTimeout(() => {
          router.push('/')
        }, 3000)
      }
    },
    onError: (error) => {
      console.error('Failed to submit feedback:', error)
      haptics.error()
      handleSubmissionError(error)
    }
  })

  const uploadPhotosMutation = useUploadFeedbackPhotos(api, {
    onSuccess: (result) => {
      if (result.success && result.data) {
        // Update local photos with uploaded data
        setPhotos(prev =>
          prev.map(photo => {
            const uploadedPhoto = result.data!.find(up => up.originalName === photo.file.name)
            if (uploadedPhoto) {
              return {
                ...photo,
                id: uploadedPhoto.id,
                uploading: false,
                uploaded: true,
                progress: 100
              }
            }
            return photo
          })
        )
      }
    },
    onError: (error) => {
      console.error('Photo upload failed:', error)
      // Handle upload errors per photo
      setPhotos(prev =>
        prev.map(photo => photo.uploading ? {
          ...photo,
          uploading: false,
          error: error.message
        } : photo)
      )
    }
  })

  const deletePhotoMutation = useDeleteFeedbackPhoto(api)

  // Error handling helper
  const handleSubmissionError = (error: Error) => {
    const errorMessage = error.message.toLowerCase()

    let errorTitle = 'Failed to submit feedback'
    let errorDescription = 'Please try again'

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      errorTitle = 'Network error'
      errorDescription = 'Please check your internet connection and try again'
    } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      errorTitle = 'Service temporarily unavailable'
      errorDescription = 'The feedback system is currently under maintenance. Please try again later'
    } else if (errorMessage.includes('validation')) {
      errorTitle = 'Invalid feedback data'
      errorDescription = error.message
    }

    toast.error(errorTitle, {
      description: errorDescription,
      duration: 5000,
      action: {
        label: 'Retry',
        onClick: () => handleSubmit()
      }
    })
  }

  // Real loading management
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  // Track form changes for unsaved warnings
  useEffect(() => {
    const hasChanges = overallRating > 0 ||
                      categories.some(cat => cat.rating > 0) ||
                      selectedQuickFeedback.length > 0 ||
                      comment.trim() !== '' ||
                      photos.length > 0
    setIsDirty(hasChanges)
  }, [overallRating, categories, selectedQuickFeedback, comment, photos])

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !submitted) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty, submitted])

  // Enhanced quick feedback options with better categorization
  const quickFeedbackOptions: LocalQuickFeedback[] = [
    { id: 'delicious', label: 'Delicious food', icon: Heart, type: 'positive' },
    { id: 'friendly', label: 'Friendly staff', icon: ThumbsUp, type: 'positive' },
    { id: 'fast', label: 'Quick service', icon: Clock, type: 'positive' },
    { id: 'clean', label: 'Clean environment', icon: CheckCircle, type: 'positive' },
    { id: 'great_value', label: 'Great value', icon: DollarSign, type: 'positive' },
    { id: 'recommended', label: 'Highly recommended', icon: Heart, type: 'positive' },
    { id: 'slow', label: 'Slow service', icon: Clock, type: 'negative' },
    { id: 'cold', label: 'Food was cold', icon: ThumbsDown, type: 'negative' },
    { id: 'expensive', label: 'Too expensive', icon: DollarSign, type: 'negative' },
    { id: 'poor_quality', label: 'Poor food quality', icon: ThumbsDown, type: 'negative' },
    { id: 'unfriendly', label: 'Unfriendly staff', icon: Users, type: 'negative' },
    { id: 'dirty', label: 'Cleanliness issues', icon: X, type: 'negative' },
    { id: 'average', label: 'Just okay', icon: Meh, type: 'neutral' },
    { id: 'as_expected', label: 'As expected', icon: CheckCircle, type: 'neutral' }
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
    const validFiles: File[] = []

    // Validate files first
    for (let i = 0; i < files.length && photos.length + validFiles.length < maxPhotos; i++) {
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

      validFiles.push(file)
    }

    if (validFiles.length === 0) {
      event.target.value = ''
      return
    }

    // Add files to local state immediately with previews
    const newPhotos: LocalUploadedPhoto[] = validFiles.map((file, index) => ({
      id: `photo-${Date.now()}-${index}`,
      file,
      preview: URL.createObjectURL(file),
      uploading: true
    }))

    setPhotos(prev => [...prev, ...newPhotos])
    event.target.value = ''

    // Upload files using the mutation
    try {
      await uploadPhotosMutation.mutateAsync(validFiles)
      toast.success(`${validFiles.length} photo(s) uploaded successfully`)
    } catch (error) {
      console.error('Photo upload failed:', error)
      // Error handling is done in the mutation's onError callback
    }
  }

  const removePhoto = async (photoId: string) => {
    const photoToRemove = photos.find(p => p.id === photoId)
    if (!photoToRemove) return

    try {
      // Delete from server if it was uploaded and has a real ID
      if (!photoToRemove.uploading && !photoId.startsWith('photo-')) {
        await deletePhotoMutation.mutateAsync(photoId)
      }

      // Remove from local state
      setPhotos(prev => {
        URL.revokeObjectURL(photoToRemove.preview)
        return prev.filter(p => p.id !== photoId)
      })

      toast.success('Photo removed')
    } catch (error) {
      console.error('Failed to delete photo:', error)

      // Still remove from local state even if server deletion fails
      setPhotos(prev => {
        URL.revokeObjectURL(photoToRemove.preview)
        return prev.filter(p => p.id !== photoId)
      })

      // Enhanced photo deletion error handling
      let errorMessage = 'Photo removed from feedback. Server deletion failed'
      if (error instanceof Error) {
        const errorText = error.message.toLowerCase()
        if (errorText.includes('network') || errorText.includes('404')) {
          errorMessage = 'Photo removed locally. Server deletion failed but your feedback will still work'
        } else if (errorText.includes('403') || errorText.includes('unauthorized')) {
          errorMessage = 'Photo removed from feedback. Server access denied'
        }
      }

      toast.error(errorMessage)
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
    // Validation
    if (overallRating === 0) {
      haptics.error()
      toast.error('Please provide an overall rating')
      return
    }

    if (!restaurantId) {
      haptics.error()
      toast.error('Restaurant information is missing')
      return
    }

    haptics.formSubmit()

    try {
      const feedbackData: CreateFeedbackRequest = {
        orderId: orderId || undefined,
        restaurantId,
        tableId: tableId || undefined,
        overallRating,
        categories: categories.reduce((acc, cat) => {
          if (cat.rating > 0) {
            acc[cat.id] = cat.rating
          }
          return acc
        }, {} as Record<string, number>),
        quickFeedback: selectedQuickFeedback,
        comment: comment.trim() || undefined,
        photos: photos
          .filter(p => !p.uploading && !p.id.startsWith('photo-')) // Only include uploaded photos
          .map(photo => ({
            id: photo.id,
            filename: photo.file.name,
            size: photo.file.size,
            type: photo.file.type
          })),
        guestInfo: showGuestInfo && (guestInfo.name || guestInfo.email || guestInfo.phone)
          ? {
              name: guestInfo.name || undefined,
              email: guestInfo.email || undefined,
              phone: guestInfo.phone || undefined
            }
          : undefined
      }

      console.log('Submitting feedback:', feedbackData)
      await createFeedbackMutation.mutateAsync(feedbackData)
    } catch (error) {
      // Error handling is managed by the mutation's onError callback
      console.error('Feedback submission failed:', error)
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
            className="w-full p-4 border border-default rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
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