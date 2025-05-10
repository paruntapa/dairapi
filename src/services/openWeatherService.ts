import axios from 'axios';

interface GeocodingResult {
  lat: number;
  lon: number;
  name: string;
  country: string;
}

export class OpenWeatherService {
  private apiKey: string;
  private geocodingBaseUrl = 'http://api.openweathermap.org/geo/1.0/direct';

  constructor() {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      throw new Error('OpenWeather API key is not defined in environment variables');
    }
    this.apiKey = apiKey;
  }

  /**
   @param placeName 
   @returns 
   */
  async getCoordinatesForPlace(placeName: string): Promise<{ latitude: number; longitude: number }> {
    try {
      const response = await axios.get<GeocodingResult[]>(this.geocodingBaseUrl, {
        params: {
          q: placeName,
          limit: 1,
          appid: this.apiKey
        }
      });

      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        throw new Error(`No location found for place name: ${placeName}`);
      }

      const result = response.data[0];

      if (result && (typeof result.lat !== 'number' || typeof result.lon !== 'number')) {
        throw new Error(`Invalid coordinates received for place name: ${placeName}`);
      }

      return {
        latitude: result?.lat ?? 0,
        longitude: result?.lon ?? 0
      };
    } catch (error) {
      console.error('Error fetching coordinates from OpenWeather API:', error);
      throw new Error(`Failed to get coordinates for '${placeName}'. Please check the place name or provide coordinates manually.`);
    }
  }
} 