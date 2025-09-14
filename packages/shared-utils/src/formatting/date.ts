/**
 * Date and time formatting utilities for Tabsy platform
 */

export type DateFormatStyle = 'full' | 'long' | 'medium' | 'short';
export type TimeFormatStyle = 'full' | 'long' | 'medium' | 'short';

/**
 * Format date with various styles
 */
export const formatDate = (
  date: Date | string,
  style: DateFormatStyle = 'medium',
  locale = 'en-US'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat(locale, {
    dateStyle: style,
  }).format(dateObj);
};

/**
 * Format time with various styles
 */
export const formatTime = (
  date: Date | string,
  style: TimeFormatStyle = 'short',
  locale = 'en-US'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat(locale, {
    timeStyle: style,
  }).format(dateObj);
};

/**
 * Format date and time together
 */
export const formatDateTime = (
  date: Date | string,
  dateStyle: DateFormatStyle = 'medium',
  timeStyle: TimeFormatStyle = 'short',
  locale = 'en-US'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat(locale, {
    dateStyle: dateStyle,
    timeStyle: timeStyle,
  }).format(dateObj);
};

/**
 * Format relative time (e.g., "2 minutes ago", "in 1 hour")
 */
export const formatRelativeTime = (
  date: Date | string,
  locale = 'en-US'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  
  if (Math.abs(diffInSeconds) < 60) {
    return formatter.format(-diffInSeconds, 'second');
  } else if (Math.abs(diffInSeconds) < 3600) {
    return formatter.format(-Math.floor(diffInSeconds / 60), 'minute');
  } else if (Math.abs(diffInSeconds) < 86400) {
    return formatter.format(-Math.floor(diffInSeconds / 3600), 'hour');
  } else if (Math.abs(diffInSeconds) < 2592000) {
    return formatter.format(-Math.floor(diffInSeconds / 86400), 'day');
  } else if (Math.abs(diffInSeconds) < 31536000) {
    return formatter.format(-Math.floor(diffInSeconds / 2592000), 'month');
  } else {
    return formatter.format(-Math.floor(diffInSeconds / 31536000), 'year');
  }
};

/**
 * Format order time for restaurant dashboard (e.g., "2:34 PM • 3 min ago")
 */
export const formatOrderTime = (date: Date | string, locale = 'en-US'): string => {
  const time = formatTime(date, 'short', locale);
  const relative = formatRelativeTime(date, locale);
  return `${time} • ${relative}`;
};

/**
 * Format business hours (e.g., "9:00 AM - 10:00 PM")
 */
export const formatBusinessHours = (
  openTime: string,
  closeTime: string,
  locale = 'en-US'
): string => {
  const formatTimeString = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return formatTime(date, 'short', locale);
  };

  return `${formatTimeString(openTime)} - ${formatTimeString(closeTime)}`;
};

/**
 * Format duration in minutes to human readable format
 */
export const formatDuration = (minutes: number, locale = 'en-US'): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Format estimated wait time for orders
 */
export const formatWaitTime = (minutes: number): string => {
  if (minutes <= 0) return 'Ready now';
  if (minutes <= 5) return '~5 min';
  if (minutes <= 10) return '~10 min';
  if (minutes <= 15) return '~15 min';
  if (minutes <= 20) return '~20 min';
  if (minutes <= 30) return '~30 min';
  if (minutes <= 45) return '~45 min';
  if (minutes <= 60) return '~1 hour';
  
  const hours = Math.ceil(minutes / 60);
  return `~${hours} hour${hours > 1 ? 's' : ''}`;
};

/**
 * Check if date is today
 */
export const isToday = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if date is yesterday
 */
export const isYesterday = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return (
    dateObj.getDate() === yesterday.getDate() &&
    dateObj.getMonth() === yesterday.getMonth() &&
    dateObj.getFullYear() === yesterday.getFullYear()
  );
};

/**
 * Format date for display with context (Today, Yesterday, or date)
 */
export const formatDateWithContext = (
  date: Date | string,
  locale = 'en-US'
): string => {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return formatDate(date, 'short', locale);
};

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
export const parseTimeToMinutes = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
export const minutesToTimeString = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Get current timestamp in ISO format
 */
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Check if restaurant is open based on current time and business hours
 */
export const isRestaurantOpen = (
  openTime: string,
  closeTime: string,
  currentTime?: Date
): boolean => {
  const now = currentTime || new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const openMinutes = parseTimeToMinutes(openTime);
  const closeMinutes = parseTimeToMinutes(closeTime);
  
  // Handle overnight hours (e.g., 22:00 - 02:00)
  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  }
  
  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
};

export default {
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatOrderTime,
  formatBusinessHours,
  formatDuration,
  formatWaitTime,
  isToday,
  isYesterday,
  formatDateWithContext,
  parseTimeToMinutes,
  minutesToTimeString,
  getCurrentTimestamp,
  isRestaurantOpen,
};
