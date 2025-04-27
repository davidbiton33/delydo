// Geocoding service to convert addresses to coordinates using Google Maps API

// Your Google Maps API key - in a real application, this should be stored in environment variables
// For now, we'll use a fallback approach to avoid API key issues
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

/**
 * Function to convert address to coordinates using Google Maps Geocoding API
 * @param {string} address - The address to geocode
 * @returns {Promise<{latitude: number, longitude: number}>} - The coordinates
 */
export const geocodeAddress = async (address) => {
  try {
    // If no address provided, return default coordinates
    if (!address || address.trim() === '') {
      console.warn('No address provided for geocoding');
      return { latitude: 32.0853, longitude: 34.7818 }; // Default to Tel Aviv
    }

    // If API key is not set, use default coordinates
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key not set, using default coordinates');
      return { latitude: 32.0853, longitude: 34.7818 }; // Default to Tel Aviv
    }

    try {
      // Encode the address for URL
      const encodedAddress = encodeURIComponent(address);

      // Construct the Google Maps Geocoding API URL
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;

      // Make the API request
      const response = await fetch(url);
      const data = await response.json();

      // Check if the API returned results
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          latitude: location.lat,
          longitude: location.lng
        };
      } else {
        console.error('Geocoding API error:', data.status);
        // Fallback to default coordinates for Israel (Tel Aviv)
        return { latitude: 32.0853, longitude: 34.7818 };
      }
    } catch (fetchError) {
      console.error('Error fetching geocoding data:', fetchError);
      return { latitude: 32.0853, longitude: 34.7818 }; // Default to Tel Aviv
    }
  } catch (error) {
    console.error('Error geocoding address:', error);
    // Fallback to default coordinates for Israel (Tel Aviv)
    return { latitude: 32.0853, longitude: 34.7818 };
  }
};
