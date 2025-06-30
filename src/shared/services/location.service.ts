import { Injectable } from "@nestjs/common";
import axios from "axios";

@Injectable()
export class LocationService {
  private readonly geocodingApiUrl = "https://maps.googleapis.com/maps/api/geocode/json";
  private readonly placeDetailsApiUrl = "https://maps.googleapis.com/maps/api/place/details/json";
  private readonly apiKey = process.env.GOOGLE_MAPS_API_KEY;

  async getLocationDetails({ placeId, latitude, longitude }: { placeId: string; latitude: number; longitude: number }) {
    console.log("getLocationDetails() function called. placeId:: ", placeId);
    if (placeId) {
      // Use Place ID for details
      console.log("getLocationDetails() func:: placeId:", placeId);
      const response = await axios.get(this.placeDetailsApiUrl, {
        params: { placeid: placeId, key: this.apiKey },
      });
      const result = response.data.result;
      console.log("getLocation return above");      
      return {
        formattedAddress: result.formatted_address,
        country: this.getComponent(result.address_components, "country"),
        state: this.getComponent(result.address_components, "administrative_area_level_1"),
        city: this.getComponent(result.address_components, "locality"),
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
      };
    } else {
      // Use lat/lng for reverse geocoding
      console.log("getLocationDetails() function called. placeId:: ", placeId, latitude, longitude);
      const response = await axios.get(this.geocodingApiUrl, {
        params: { latlng: `${latitude},${longitude}`, key: this.apiKey },
      });
      console.log("getLocationDetails() function called. response:: ", response);
    
      const result = response.data.results[0];
      console.log("getLocationDetails() function called. result:: ", result);
      return {
        formattedAddress: result.formatted_address,
        country: this.getComponent(result.address_components, "country"),
        state: this.getComponent(result.address_components, "administrative_area_level_1"),
        city: this.getComponent(result.address_components, "locality"),
        latitude,
        longitude,
      };
    }
  }

  private getComponent(components: any[], type: string): string | null {
    return components.find(comp => comp.types.includes(type))?.long_name || null;
  }
}
