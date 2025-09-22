/**
 * Notification Sound Service
 * Handles playing notification sounds with mute state awareness
 */

export interface NotificationSoundOptions {
  type: 'assistance' | 'order' | 'general'
  urgency?: 'low' | 'normal' | 'high'
  volume?: number // 0 to 1
}

class NotificationSoundService {
  private audioContext: AudioContext | null = null
  private sounds: Map<string, AudioBuffer> = new Map()

  constructor() {
    // Initialize audio context on first user interaction
    this.initializeAudioContext()
  }

  private initializeAudioContext() {
    if (typeof window === 'undefined') return

    // Create audio context on first user interaction to avoid autoplay restrictions
    const initAudio = () => {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      document.removeEventListener('click', initAudio)
      document.removeEventListener('keydown', initAudio)
    }

    document.addEventListener('click', initAudio)
    document.addEventListener('keydown', initAudio)
  }

  /**
   * Check if notifications are currently muted
   * This method is now overridden by external context
   */
  private isMuted(): boolean {
    if (typeof window === 'undefined') return false

    const notificationsMuted = localStorage.getItem('notificationsMuted') === 'true'
    const muteEndTimeStr = localStorage.getItem('muteEndTime')
    const audioMuted = localStorage.getItem('audioMuted') === 'true'

    // Check both notification mute (visual + audio) and audio-only mute
    if (audioMuted) return true

    if (notificationsMuted && muteEndTimeStr) {
      const muteEndTime = new Date(muteEndTimeStr)
      return muteEndTime > new Date()
    }

    return false
  }

  /**
   * Play a notification sound based on type and urgency
   * Note: Mute checking is now handled externally by the context
   */
  async playNotificationSound(options: NotificationSoundOptions): Promise<void> {
    console.log('🎵 NotificationSoundService: Playing sound', options)

    // Don't play if no audio context
    if (!this.audioContext) {
      console.warn('Audio context not available')
      return
    }

    try {
      // Generate sound based on type and urgency
      await this.playGeneratedSound(options)
    } catch (error) {
      console.error('Failed to play notification sound:', error)
    }
  }

  /**
   * Generate and play synthesized notification sounds
   */
  private async playGeneratedSound(options: NotificationSoundOptions): Promise<void> {
    if (!this.audioContext) return

    const ctx = this.audioContext
    const gainNode = ctx.createGain()
    const oscillator = ctx.createOscillator()

    // Connect nodes
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Configure sound based on type and urgency
    const soundConfig = this.getSoundConfig(options)

    oscillator.frequency.setValueAtTime(soundConfig.frequency, ctx.currentTime)
    oscillator.type = soundConfig.waveType

    // Volume and envelope
    const baseVolume = options.volume ?? soundConfig.volume
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(baseVolume, ctx.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + soundConfig.duration)

    // Play sound
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + soundConfig.duration)

    // Play multiple notes for certain types
    if (soundConfig.melody) {
      for (let i = 1; i < soundConfig.melody.length; i++) {
        const noteOsc = ctx.createOscillator()
        const noteGain = ctx.createGain()

        noteOsc.connect(noteGain)
        noteGain.connect(ctx.destination)

        const startTime = ctx.currentTime + (i * 0.15)
        noteOsc.frequency.setValueAtTime(soundConfig.melody[i], startTime)
        noteOsc.type = soundConfig.waveType

        noteGain.gain.setValueAtTime(0, startTime)
        noteGain.gain.linearRampToValueAtTime(baseVolume * 0.7, startTime + 0.01)
        noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1)

        noteOsc.start(startTime)
        noteOsc.stop(startTime + 0.1)
      }
    }
  }

  /**
   * Get sound configuration based on notification type and urgency
   */
  private getSoundConfig(options: NotificationSoundOptions) {
    const { type, urgency = 'normal' } = options

    const baseConfigs = {
      assistance: {
        low: { frequency: 600, volume: 0.3, duration: 0.2, waveType: 'sine' as OscillatorType },
        normal: { frequency: 800, volume: 0.5, duration: 0.3, waveType: 'sine' as OscillatorType, melody: [800, 1000] },
        high: { frequency: 1000, volume: 0.7, duration: 0.5, waveType: 'sine' as OscillatorType, melody: [1000, 1200, 1000] }
      },
      order: {
        low: { frequency: 400, volume: 0.3, duration: 0.15, waveType: 'triangle' as OscillatorType },
        normal: { frequency: 500, volume: 0.4, duration: 0.2, waveType: 'triangle' as OscillatorType },
        high: { frequency: 700, volume: 0.6, duration: 0.3, waveType: 'triangle' as OscillatorType }
      },
      general: {
        low: { frequency: 300, volume: 0.2, duration: 0.1, waveType: 'sine' as OscillatorType },
        normal: { frequency: 400, volume: 0.3, duration: 0.15, waveType: 'sine' as OscillatorType },
        high: { frequency: 600, volume: 0.5, duration: 0.2, waveType: 'sine' as OscillatorType }
      }
    }

    return baseConfigs[type][urgency]
  }

  /**
   * Test sound functionality (for settings/preview)
   */
  async testSound(options: NotificationSoundOptions): Promise<void> {
    // Temporarily bypass mute for testing
    const originalIsMuted = this.isMuted
    this.isMuted = () => false

    await this.playNotificationSound(options)

    // Restore original mute check
    this.isMuted = originalIsMuted
  }
}

// Export singleton instance
export const notificationSoundService = new NotificationSoundService()

// Convenience functions
export const playAssistanceSound = (urgency: 'low' | 'normal' | 'high' = 'normal') => {
  return notificationSoundService.playNotificationSound({
    type: 'assistance',
    urgency
  })
}

export const playOrderSound = (urgency: 'low' | 'normal' | 'high' = 'normal') => {
  return notificationSoundService.playNotificationSound({
    type: 'order',
    urgency
  })
}

export const playGeneralSound = (urgency: 'low' | 'normal' | 'high' = 'normal') => {
  return notificationSoundService.playNotificationSound({
    type: 'general',
    urgency
  })
}