import { useEffect, useRef, useState } from 'react'

interface UseNotificationSoundOptions {
  enabled?: boolean
  volume?: number
  priority?: 'low' | 'normal' | 'high'
}

export function useNotificationSound({
  enabled = true,
  volume = 0.5,
  priority = 'normal'
}: UseNotificationSoundOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Check if audio is supported
    if (typeof Audio !== 'undefined') {
      setIsSupported(true)

      // Create audio element with appropriate sound based on priority
      const soundFile = priority === 'high'
        ? 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+ryxHkpBiGO0/LNdSYEJHfH7+OGPA8XZrPn+bhWGQ1Kqu7vzXYmBDt+zPDVdCYGLX3I9N2ROQwSXrPv57VaGg9Mqe7wz3EjByN7yu7adjAEIXnN7OGNOwYUYLPq86ZUFAxRou7wx3IsBS1+zfDUeiQFKnfG8N2QQQcUYrPx57VaGg9Mqe3wznAmBnN6x+3ncjEEIXrN7OGNOwkUYLPq86ZTEwtRoe7wxnMpBzl/zfDUeiQFKXfH8N2QQggRYrLp9bdSGw5Kr+3yynAmBnN6x+3ncjEEIXrN7OGNOwkUYrPq86ZTEgtRoe7wxnMqBzl/zfDUeSSGYrLp9bdSGw5Kr+3yynAmBnN6x+3ncjEEIXrN7OGNOwkUYrPq86ZTEgtRoe7wxnMqBzl/zfDUeSSGYrLp9bdSGw5Kr+3yynAmBnN6x+3ncjEEIXrN7OGNOwkUYrPq86ZTEgtRoe7wxnMqBzl/zfDUeSSGYrLp9bdSGw5Kr+3yynAmBnN6x+3ncjEEIXrN7OGNOwkUYrPq86ZTEgtRoe7wxnMqBzl/zfDUeSGAqgAA'
        : 'data:audio/wav;base64,UklGRlwCAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YTgCAAC4uLi4qKioqKioqKiop6enoaGhm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ub'

      audioRef.current = new Audio(soundFile)
      audioRef.current.volume = volume
      audioRef.current.preload = 'auto'
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [volume, priority])

  const playSound = async () => {
    if (!enabled || !isSupported || !audioRef.current) return

    try {
      // Reset audio to beginning
      audioRef.current.currentTime = 0

      // Play the sound
      await audioRef.current.play()
    } catch (error) {
      console.warn('Failed to play notification sound:', error)
      // Fallback to system beep if available
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance('beep')
        utterance.volume = 0.1
        utterance.rate = 10
        window.speechSynthesis.speak(utterance)
      }
    }
  }

  return {
    playSound,
    isSupported
  }
}