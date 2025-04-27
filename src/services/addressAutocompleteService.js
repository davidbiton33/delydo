// Address Autocomplete Service using Geoapify API
// This service offers a free tier with 3,000 requests per day

// Geoapify API key
const GEOAPIFY_API_KEY = '8c6f9312ec624ead80e19289e4d15db4';

/**
 * Function to get address suggestions based on input text
 * @param {string} input - The partial address text
 * @returns {Promise<Array<{value: string, label: string}>>} - Array of address suggestions
 */
export const getAddressSuggestions = async (input) => {
  try {
    // If no input provided, return empty array
    if (!input || input.trim() === '') {
      return [];
    }

    // Encode the input for URL
    const encodedInput = encodeURIComponent(input);

    // Construct the Geoapify Geocoding API URL
    const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodedInput}&filter=countrycode:il&format=json&limit=5&lang=he&apiKey=${GEOAPIFY_API_KEY}`;
    console.log('Fetching from URL:', url);

    // Make the API request
    const response = await fetch(url);
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('API response data:', data);

    // If we got an error response or no results, return empty array
    if (data.error || !data.results || data.results.length === 0) {
      console.warn('No results found from Geoapify API');
      return [];
    }

    // Process and return the results
    console.log('Processing results:', data.results);

    return data.results.map(result => {
      // Get address components directly from the result object
      const houseNumber = result.housenumber || '';
      const street = result.street || '';
      const city = result.city || '';

      // Get the formatted address but remove postal code and country
      let formattedAddress = result.formatted || '';

      // Remove postal code (usually 7 digits in Israel) and country name
      formattedAddress = formattedAddress
        .replace(/\d{7}/, '') // Remove postal code
        .replace(/ישראל/, '') // Remove country name
        .replace(/,\s*,/g, ',') // Fix double commas
        .replace(/,\s*$/g, '') // Remove trailing comma
        .trim();

      // Use address line 1 (usually street and number) directly
      const addressLine1 = result.address_line1 || '';

      // Create a display name - prefer a simplified version
      let displayName = '';

      // If we have street and house number, use them
      if (street && houseNumber) {
        displayName = `${street} ${houseNumber}`;
        if (city) {
          displayName += `, ${city}`;
        }
      } else if (addressLine1) {
        // Otherwise use address line 1
        displayName = addressLine1;
        if (city && !addressLine1.includes(city)) {
          displayName += `, ${city}`;
        }
      } else {
        // Last resort - use the cleaned formatted address
        displayName = formattedAddress;
      }

      // Last resort
      if (!displayName) {
        displayName = 'כתובת ללא פרטים';
      }

      console.log('Created display name:', displayName);

      // Extract coordinates
      const lat = parseFloat(result.lat || 0);
      const lon = parseFloat(result.lon || 0);

      return {
        value: displayName,
        label: displayName,
        lat,
        lon,
        houseNumber,
        street,
        city,
        fullAddress: formattedAddress
      };
    });
  } catch (error) {
    console.error('Error in getAddressSuggestions:', error);
    return []; // Return empty array on error
  }
};

/**
 * Function to get place details including coordinates from a suggestion
 * @param {Object} suggestion - The suggestion object from getAddressSuggestions
 * @returns {Object} - Place details with address and coordinates
 */
export const getPlaceDetails = (suggestion) => {
  // Check if we have a valid suggestion with coordinates
  if (suggestion && suggestion.lat && suggestion.lon) {
    return {
      address: suggestion.value || suggestion.label,
      latitude: suggestion.lat,
      longitude: suggestion.lon,
      houseNumber: suggestion.houseNumber || '',
      street: suggestion.street || '',
      city: suggestion.city || ''
    };
  }

  // If for some reason we don't have coordinates, return null
  console.warn('No coordinates found in suggestion');
  return null;
};
