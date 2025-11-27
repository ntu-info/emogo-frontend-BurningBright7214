import * as Location from 'expo-location';

// 請求位置權限
export async function requestLocationPermission() {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  
  if (foregroundStatus !== 'granted') {
    console.log('❌ Location permission not granted');
    return false;
  }
  
  console.log('✅ Location permission granted');
  return true;
}

// 取得當前位置
export async function getCurrentLocation() {
  try {
    const hasPermission = await requestLocationPermission();
    
    if (!hasPermission) {
      return null;
    }
    
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    
    console.log('📍 Location obtained:', location.coords.latitude, location.coords.longitude);
    
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: new Date(location.timestamp).toISOString(),
    };
  } catch (error) {
    console.error('❌ Error getting location:', error);
    return null;
  }
}

// 取得地址（反向地理編碼）
export async function getAddressFromCoordinates(latitude, longitude) {
  try {
    const addresses = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });
    
    if (addresses.length > 0) {
      const addr = addresses[0];
      return {
        city: addr.city,
        district: addr.district,
        street: addr.street,
        name: addr.name,
        fullAddress: [addr.city, addr.district, addr.street, addr.name]
          .filter(Boolean)
          .join(' '),
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting address:', error);
    return null;
  }
}

