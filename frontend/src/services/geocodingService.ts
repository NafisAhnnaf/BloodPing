export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
  city?: string;
  country?: string;
}

export const geocodingService = {
  /**
   * Search an address or city name using free OpenStreetMap Nominatim API.
   */
  async searchAddress(query: string): Promise<GeocodingResult[]> {
    if (!query || query.trim().length < 2) return [];

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query.trim()
        )}&limit=5&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.statusText}`);
      }

      const data = await response.json();
      return (data || []).map((item: any) => {
        const address = item.address || {};
        const city =
          address.city ||
          address.town ||
          address.municipality ||
          address.suburb ||
          address.state_district ||
          address.state ||
          '';

        return {
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          displayName: item.display_name,
          city,
          country: address.country || '',
        };
      });
    } catch (error) {
      console.warn('Geocoding search failed:', error);
      return [];
    }
  },

  /**
   * Reverse geocode latitude and longitude to get a human-readable address.
   */
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );

      if (!response.ok) {
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }

      const data = await response.json();
      if (data && data.display_name) {
        const addr = data.address || {};
        const neighborhood = addr.neighbourhood || addr.suburb || addr.quarter || '';
        const city = addr.city || addr.town || addr.municipality || addr.state || '';
        if (neighborhood && city) {
          return `${neighborhood}, ${city}`;
        }
        return data.display_name.split(',').slice(0, 3).join(',').trim();
      }
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  },
};
