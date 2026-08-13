import { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { registerPushToken } from './src/notifications';
import Landing from './src/screens/Landing';
import Login from './src/screens/Login';
import Menu from './src/screens/Menu';
import OrderHistory from './src/screens/OrderHistory';
import OrderTracking from './src/screens/OrderTracking';

const Stack = createNativeStackNavigator();

function handleNotificationTap(navigationRef, response) {
  const data = response?.notification?.request?.content?.data || {};
  if (data.type === 'order' && data.orderId) {
    navigationRef.current?.navigate('Order', { id: data.orderId });
  }
}

function RootNavigator() {
  const navigationRef = useRef(null);
  const { user } = useAuth();

  // (Re)register the device push token whenever a user is logged in. This also
  // handles token rollover on app restart.
  useEffect(() => {
    if (user) registerPushToken();
  }, [user]);

  // Navigate to the order when the user taps a notification.
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      handleNotificationTap(navigationRef, response);
    });
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationTap(navigationRef, response);
    });
    return () => subscription.remove();
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Landing" component={Landing} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Menu" component={Menu} />
        <Stack.Screen name="Orders" component={OrderHistory} />
        <Stack.Screen name="Order" component={OrderTracking} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
