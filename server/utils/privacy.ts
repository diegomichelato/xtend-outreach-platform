/**
 * Privacy Utilities
 * ---------------
 * Functions for ensuring user privacy in tracking
 */

import crypto from 'crypto';

/**
 * Truncate IP address to preserve privacy
 * For IPv4, removes the last octet
 * For IPv6, removes the last 80 bits (last 5 segments)
 * 
 * @param ipAddress The original IP address
 * @returns Truncated IP address
 */
export function truncateIPAddress(ipAddress: string): string {
  if (!ipAddress) return '';
  
  // Handle IPv4 addresses
  if (ipAddress.includes('.')) {
    const parts = ipAddress.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  }
  
  // Handle IPv6 addresses
  if (ipAddress.includes(':')) {
    const parts = ipAddress.split(':');
    if (parts.length >= 5) {
      return parts.slice(0, 3).join(':') + '::0';
    }
  }
  
  // If we can't identify the format, return a placeholder
  return 'anonymous';
}

/**
 * Check if DNT (Do Not Track) header is set
 * 
 * @param headers HTTP request headers
 * @returns Boolean indicating if DNT is enabled
 */
export function isDoNotTrackEnabled(headers: Record<string, string | string[] | undefined>): boolean {
  const dnt = headers['dnt'] || headers['DNT'];
  return dnt === '1' || dnt === 1 || dnt === 'true' || dnt === true;
}

/**
 * Anonymize user agent string by removing specific version information
 * 
 * @param userAgent Original user agent string
 * @returns Anonymized user agent
 */
export function anonymizeUserAgent(userAgent: string): string {
  if (!userAgent) return 'unknown';
  
  // Extract browser and OS info without version numbers
  try {
    // Match common browsers
    let browser = 'unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('MSIE') || userAgent.includes('Trident')) browser = 'Internet Explorer';
    
    // Match common operating systems
    let os = 'unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS X')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    
    // Match device type
    let device = 'Desktop';
    if (userAgent.includes('Mobile')) device = 'Mobile';
    else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) device = 'Tablet';
    
    return `${browser} on ${os} (${device})`;
  } catch (error) {
    // Fall back to a more generic string if parsing fails
    return 'Web Browser';
  }
}

/**
 * Generate a privacy-aware tracking ID 
 * This doesn't directly correlate to user identity
 * 
 * @param campaignId Campaign ID 
 * @param emailId Email ID
 * @returns Securely hashed tracking ID
 */
export function generateTrackingId(campaignId: number, emailId: number): string {
  const uniqueString = `${campaignId}-${emailId}-${Date.now()}-${Math.random()}`;
  return crypto.createHash('sha256').update(uniqueString).digest('hex').slice(0, 24);
}

/**
 * Detect basic device type from user agent string
 * 
 * @param userAgent User agent string
 * @returns Device type (desktop, mobile, tablet, or unknown)
 */
export function detectDeviceType(userAgent: string): string {
  if (!userAgent) return 'unknown';
  
  const lowerUA = userAgent.toLowerCase();
  
  if (lowerUA.includes('mobile') || lowerUA.includes('android') || lowerUA.includes('iphone')) {
    return 'mobile';
  } 
  
  if (lowerUA.includes('ipad') || lowerUA.includes('tablet')) {
    return 'tablet';
  }
  
  if (lowerUA.includes('windows') || lowerUA.includes('macintosh') || lowerUA.includes('linux')) {
    return 'desktop';
  }
  
  return 'unknown';
}

/**
 * Get a general browser family from user agent
 * 
 * @param userAgent User agent string
 * @returns Browser family name
 */
export function detectBrowserFamily(userAgent: string): string {
  if (!userAgent) return 'unknown';
  
  const lowerUA = userAgent.toLowerCase();
  
  if (lowerUA.includes('firefox')) return 'Firefox';
  if (lowerUA.includes('edge')) return 'Edge';
  if (lowerUA.includes('chrome')) return 'Chrome';
  if (lowerUA.includes('safari') && !lowerUA.includes('chrome')) return 'Safari';
  if (lowerUA.includes('opera') || lowerUA.includes('opr')) return 'Opera';
  if (lowerUA.includes('msie') || lowerUA.includes('trident')) return 'Internet Explorer';
  
  return 'unknown';
}

/**
 * Get a general operating system family from user agent
 * 
 * @param userAgent User agent string
 * @returns OS family name
 */
export function detectOSFamily(userAgent: string): string {
  if (!userAgent) return 'unknown';
  
  const lowerUA = userAgent.toLowerCase();
  
  if (lowerUA.includes('windows')) return 'Windows';
  if (lowerUA.includes('mac os x') || lowerUA.includes('macintosh')) return 'macOS';
  if (lowerUA.includes('android')) return 'Android';
  if (lowerUA.includes('ios') || lowerUA.includes('iphone') || lowerUA.includes('ipad')) return 'iOS';
  if (lowerUA.includes('linux') && !lowerUA.includes('android')) return 'Linux';
  
  return 'unknown';
}