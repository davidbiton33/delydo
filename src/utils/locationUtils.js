// Utility functions for location-based operations

/**
 * Calculate distance between two points using the Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} - Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  return distance;
};

/**
 * Check if a courier is within the required distance of a location
 * @param {number} courierLat - Courier's latitude
 * @param {number} courierLon - Courier's longitude
 * @param {number} targetLat - Target location latitude
 * @param {number} targetLon - Target location longitude
 * @param {number} maxDistanceKm - Maximum allowed distance in kilometers (default: 0.05 = 50 meters)
 * @returns {boolean} - True if within range, false otherwise
 */
export const isWithinRange = (courierLat, courierLon, targetLat, targetLon, maxDistanceKm = 0.05) => {
  const distance = calculateDistance(courierLat, courierLon, targetLat, targetLon);
  return distance <= maxDistanceKm;
};
