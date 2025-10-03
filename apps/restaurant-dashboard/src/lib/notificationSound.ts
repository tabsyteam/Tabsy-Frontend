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
   * Generate and play modern, professional notification sounds
   * Inspired by iOS, Slack, and Discord notification tones
   */
  private async playGeneratedSound(options: NotificationSoundOptions): Promise<void> {
    if (!this.audioContext) return

    const ctx = this.audioContext
    const soundConfig = this.getSoundConfig(options)
    const baseVolume = options.volume ?? soundConfig.volume

    // Modern sound design based on type
    if (options.type === 'assistance') {
      // Modern alert sound - pleasant ascending chime
      this.playModernChime(ctx, soundConfig, baseVolume)
    } else if (options.type === 'order') {
      // Gentle notification pop
      this.playModernPop(ctx, soundConfig, baseVolume)
    } else {
      // Subtle ding
      this.playModernDing(ctx, soundConfig, baseVolume)
    }
  }

  /**
   * Modern ascending chime (like iOS notification)
   * Warm, pleasant, attention-grabbing but not annoying
   */
  private playModernChime(ctx: AudioContext, config: any, volume: number): void {
    // Three-note ascending chime: C5 -> E5 -> G5
    const notes = config.urgency === 'high'
      ? [523.25, 659.25, 783.99] // C5, E5, G5 (urgent)
      : [523.25, 659.25] // C5, E5 (normal)

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()

      // Chain: Oscillator -> Filter -> Gain -> Destination
      osc.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      // Use sine wave for smooth, pleasant tone
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime)

      // Low-pass filter for warmth
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(2000, ctx.currentTime)
      filter.Q.setValueAtTime(1, ctx.currentTime)

      // Timing
      const startTime = ctx.currentTime + (i * 0.12)
      const duration = 0.25

      // ADSR envelope for natural sound
      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(volume * 0.4, startTime + 0.02) // Attack
      gain.gain.linearRampToValueAtTime(volume * 0.35, startTime + 0.05) // Decay
      gain.gain.setValueAtTime(volume * 0.35, startTime + 0.15) // Sustain
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration) // Release

      osc.start(startTime)
      osc.stop(startTime + duration)
    })
  }

  /**
   * Modern pop sound (like Slack/Discord)
   * Short, pleasant, UI-friendly
   */
  private playModernPop(ctx: AudioContext, config: any, volume: number): void {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    // Triangle wave for softer tone
    osc.type = 'triangle'

    // Frequency sweep for "pop" effect
    osc.frequency.setValueAtTime(800, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08)

    // Band-pass filter
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(1000, ctx.currentTime)
    filter.Q.setValueAtTime(5, ctx.currentTime)

    // Quick envelope
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(volume * 0.5, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.12)
  }

  /**
   * Subtle ding sound
   * Very gentle, for low-priority notifications
   */
  private playModernDing(ctx: AudioContext, config: any, volume: number): void {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime) // A5 note

    // Very short, gentle envelope
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(volume * 0.3, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.15)
  }

  /**
   * Get sound configuration based on notification type and urgency
   * Modern, pleasant sound profiles
   */
  private getSoundConfig(options: NotificationSoundOptions) {
    const { type, urgency = 'normal' } = options

    const baseConfigs = {
      assistance: {
        low: { volume: 0.4, urgency: 'low' },
        normal: { volume: 0.5, urgency: 'normal' },
        high: { volume: 0.7, urgency: 'high' }
      },
      order: {
        low: { volume: 0.3, urgency: 'low' },
        normal: { volume: 0.4, urgency: 'normal' },
        high: { volume: 0.6, urgency: 'high' }
      },
      general: {
        low: { volume: 0.25, urgency: 'low' },
        normal: { volume: 0.35, urgency: 'normal' },
        high: { volume: 0.5, urgency: 'high' }
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