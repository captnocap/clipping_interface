/**
 * Normalize timestamp format to ISO 8601
 * @param {string} dateString - Date string to normalize
 * @returns {string} - Normalized date string
 */
const normalizeTimestamp = (dateString) => {
  if (!dateString) return dateString;

  // Handle custom format with hyphens instead of colons in time part
  // Example: 2025-06-02T08-37-46-890Z -> 2025-06-02T08:37:46.890Z
  return dateString.replace(
    /(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/,
    '$1T$2:$3:$4.$5Z'
  );
};

/**
 * Format date string safely
 * @param {string} dateString - Date string to format
 * @param {string} fallback - Fallback string to use if date is invalid
 * @returns {string} - Formatted date string
 */
export const formatDate = (dateString, fallback = 'Unknown date') => {
  if (!dateString) return fallback;

  try {
    // Normalize the date string first
    const normalizedDate = normalizeTimestamp(dateString);

    // Try to parse the date
    const date = new Date(normalizedDate);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString, 'Normalized to:', normalizedDate);
      return fallback;
    }

    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  } catch (err) {
    console.error('Error formatting date:', err, 'for input:', dateString);
    return fallback;
  }
};

/**
 * Format date to display only the date portion
 * @param {string} dateString - Date string to format
 * @param {string} fallback - Fallback string to use if date is invalid
 * @returns {string} - Formatted date string
 */
export const formatDateOnly = (dateString, fallback = 'Unknown date') => {
  if (!dateString) return fallback;

  try {
    // Normalize the date string first
    const normalizedDate = normalizeTimestamp(dateString);

    // Try to parse the date
    const date = new Date(normalizedDate);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString, 'Normalized to:', normalizedDate);
      return fallback;
    }

    return date.toLocaleDateString();
  } catch (err) {
    console.error('Error formatting date:', err, 'for input:', dateString);
    return fallback;
  }
};

/**
 * Format duration in seconds to a readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted duration string
 */
export const formatDuration = (seconds) => {
  if (seconds === undefined || seconds === null) return 'Unknown';
  
  try {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  } catch (err) {
    console.error('Error formatting duration:', err);
    return 'Unknown';
  }
};

/**
 * Format duration in seconds to HH:MM:SS format
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted duration string
 */
export const formatTimecode = (seconds) => {
  if (seconds === undefined || seconds === null) return '00:00:00';
  
  try {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  } catch (err) {
    console.error('Error formatting timecode:', err);
    return '00:00:00';
  }
};