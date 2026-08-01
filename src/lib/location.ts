// Browser Geolocation Helper

export interface UserCoordinates {
  latitude: number;
  longitude: number;
}

export function getCurrentCoordinates(): Promise<UserCoordinates> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      // Default to New Delhi coordinates
      resolve({ latitude: 28.6139, longitude: 77.2090 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        console.warn('Geolocation access denied or unavailable, using fallback:', err.message);
        resolve({ latitude: 28.6139, longitude: 77.2090 });
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  });
}
