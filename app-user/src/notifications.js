import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { api } from './utils/api';

// Present incoming notifications while the app is running in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const CHANNEL_ID = 'orders';

export function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    return Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Order updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C62828',
    });
  }
  return Promise.resolve();
}

// Request permission and fetch an Expo push token. Returns null if the user
// declines or the token cannot be obtained (e.g. running in Expo Go on Android).
export async function getPushToken() {
  if (Platform.OS === 'android') {
    await setupNotificationChannel();
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  try {
    if (projectId) {
      return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    }
    return (await Notifications.getExpoPushTokenAsync()).data;
  } catch (err) {
    console.warn('Could not fetch Expo push token:', err);
    return null;
  }
}

// Register the device's push token with the backend. Fire-and-forget from the app.
export async function registerPushToken() {
  const token = await getPushToken();
  if (!token) return null;
  try {
    await api.savePushToken(token);
  } catch (err) {
    console.warn('Could not save push token:', err);
  }
  return token;
}
