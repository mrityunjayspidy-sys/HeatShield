import { Geolocation } from '@capacitor/geolocation';

export interface UserCoordinates {
  latitude: number;
  longitude: number;
}

export async function getCurrentCoordinates(): Promise<UserCoordinates> {
  try {
    // 1. Request Capacitor Native location permission on mobile (Android/iOS)
    const permStatus = await Geolocation.checkPermissions();
    if (permStatus.location !== 'granted') {
      await Geolocation.requestPermissions();
    }

    // 2. Fetch current high-accuracy GPS coordinates
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 3000,
    });

    if (position?.coords) {
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    }
  } catch (err) {
    console.warn('Capacitor Geolocation note/fallback:', err);
  }

  // 3. Fallback to HTML5 browser geolocation if native plugin unavailable
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
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
        console.warn('Browser geolocation fallback error:', err.message);
        resolve({ latitude: 28.6139, longitude: 77.2090 });
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  });
}

