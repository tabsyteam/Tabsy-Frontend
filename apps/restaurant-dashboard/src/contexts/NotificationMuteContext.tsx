'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface NotificationMuteContextType {
  notificationsMuted: boolean
  audioMuted: boolean
  muteEndTime: Date | null
  setNotificationsMuted: (muted: boolean) => void
  setAudioMuted: (muted: boolean) => void
  setMuteEndTime: (endTime: Date | null) => void
  toggleNotificationsMute: () => void
  toggleAudioMute: () => void
}

const NotificationMuteContext = createContext<NotificationMuteContextType | undefined>(undefined)

export function NotificationMuteProvider({ children }: { children: ReactNode }) {
  const [notificationsMuted, setNotificationsMuted] = useState(false)
  const [audioMuted, setAudioMuted] = useState(false)
  const [muteEndTime, setMuteEndTime] = useState<Date | null>(null)

  // Restore states from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Restore notification mute state
    const muteState = localStorage.getItem('notificationsMuted')
    const muteEndTimeStr = localStorage.getItem('muteEndTime')

    if (muteState === 'true' && muteEndTimeStr) {
      const endTime = new Date(muteEndTimeStr)
      const now = new Date()

      if (endTime > now) {
        setNotificationsMuted(true)
        setMuteEndTime(endTime)

        // Set timeout to auto-unmute
        const timeoutMs = endTime.getTime() - now.getTime()
        setTimeout(() => {
          setNotificationsMuted(false)
          setMuteEndTime(null)
          localStorage.removeItem('notificationsMuted')
          localStorage.removeItem('muteEndTime')
        }, timeoutMs)
      } else {
        // Mute time has expired, clean up
        localStorage.removeItem('notificationsMuted')
        localStorage.removeItem('muteEndTime')
      }
    }

    // Restore audio mute state
    const audioMuteState = localStorage.getItem('audioMuted')
    if (audioMuteState === 'true') {
      setAudioMuted(true)
    }
  }, [])

  const toggleNotificationsMute = () => {
    console.log('🔔 NotificationMuteContext: toggleNotificationsMute', { oldValue: notificationsMuted })
    if (notificationsMuted) {
      // Unmute
      console.log('🔔 Unmuting notifications')
      setNotificationsMuted(false)
      setMuteEndTime(null)
      localStorage.removeItem('notificationsMuted')
      localStorage.removeItem('muteEndTime')
    } else {
      // Mute for 30 minutes
      console.log('🔔 Muting notifications for 30 minutes')
      const endTime = new Date(Date.now() + 30 * 60 * 1000)
      setNotificationsMuted(true)
      setMuteEndTime(endTime)
      localStorage.setItem('notificationsMuted', 'true')
      localStorage.setItem('muteEndTime', endTime.toISOString())

      // Set timeout to auto-unmute
      setTimeout(() => {
        setNotificationsMuted(false)
        setMuteEndTime(null)
        localStorage.removeItem('notificationsMuted')
        localStorage.removeItem('muteEndTime')
      }, 30 * 60 * 1000)
    }
  }

  const toggleAudioMute = () => {
    const newAudioMuted = !audioMuted
    console.log('🔊 NotificationMuteContext: toggleAudioMute', { oldValue: audioMuted, newValue: newAudioMuted })
    setAudioMuted(newAudioMuted)
    localStorage.setItem('audioMuted', newAudioMuted.toString())
  }

  return (
    <NotificationMuteContext.Provider
      value={{
        notificationsMuted,
        audioMuted,
        muteEndTime,
        setNotificationsMuted,
        setAudioMuted,
        setMuteEndTime,
        toggleNotificationsMute,
        toggleAudioMute,
      }}
    >
      {children}
    </NotificationMuteContext.Provider>
  )
}

export function useNotificationMute() {
  const context = useContext(NotificationMuteContext)
  if (context === undefined) {
    throw new Error('useNotificationMute must be used within a NotificationMuteProvider')
  }
  return context
}