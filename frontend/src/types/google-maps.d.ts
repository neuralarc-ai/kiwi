// Google Maps TypeScript declarations
interface GoogleMapsAutocompleteOptions {
  types?: string[];
  fields?: string[];
  componentRestrictions?: {
    country?: string | string[];
  };
}

export interface GoogleMapsPlaceResult {
  formatted_address?: string;
  name?: string;
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  geometry?: {
    location?: {
      lat(): number;
      lng(): number;
    };
  };
}

export interface GoogleMapsAutocomplete {
  getPlace(): GoogleMapsPlaceResult;
  addListener(event: string, callback: () => void): void;
}

interface GoogleMapsPlaces {
  Autocomplete: new (inputField: HTMLInputElement, options?: GoogleMapsAutocompleteOptions) => GoogleMapsAutocomplete;
}

interface GoogleMapsEvent {
  clearInstanceListeners(instance: any): void;
}

interface GoogleMapsGeocoderResult {
  formatted_address: string;
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  geometry?: {
    location?: {
      lat(): number;
      lng(): number;
    };
  };
}

interface GoogleMapsGeocoderRequest {
  location?: { lat: number; lng: number };
  address?: string;
}

interface GoogleMapsGeocoder {
  geocode(
    request: GoogleMapsGeocoderRequest,
    callback: (results: GoogleMapsGeocoderResult[] | null, status: string) => void
  ): void;
}

interface GoogleMaps {
  places: GoogleMapsPlaces;
  event: GoogleMapsEvent;
  Geocoder: new () => GoogleMapsGeocoder;
}

declare global {
  interface Window {
    google?: {
      maps: GoogleMaps;
    };
  }

  var google: {
    maps: GoogleMaps;
  } | undefined;
}

