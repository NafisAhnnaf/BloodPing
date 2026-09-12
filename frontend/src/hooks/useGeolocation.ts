import { useState, useCallback } from 'react';

export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unsupported';
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
    permissionState: 'prompt',
  });

  const requestLocation = useCallback((): Promise<GeolocationCoordinates | null> => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        const errorMsg = 'Geolocation is not supported by your browser.';
        setState((prev) => ({
          ...prev,
          error: errorMsg,
          loading: false,
          permissionState: 'unsupported',
        }));
        resolve(null);
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: GeolocationCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setState({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            error: null,
            loading: false,
            permissionState: 'granted',
          });
          resolve(coords);
        },
        (err) => {
          let errorMsg = 'Unable to retrieve your location.';
          let permState: 'prompt' | 'granted' | 'denied' = 'prompt';

          if (err.code === err.PERMISSION_DENIED) {
            errorMsg = 'Location permission was denied. You can enter your location manually.';
            permState = 'denied';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            errorMsg = 'Location information is unavailable.';
          } else if (err.code === err.TIMEOUT) {
            errorMsg = 'Location request timed out. Please try again or enter manually.';
          }

          setState((prev) => ({
            ...prev,
            error: errorMsg,
            loading: false,
            permissionState: permState,
          }));
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }, []);

  return {
    ...state,
    requestLocation,
  };
}
