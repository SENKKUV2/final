import { SplashScreen, Stack } from 'expo-router';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function Layout() {
  useEffect(() => {
    setTimeout(() => SplashScreen.hideAsync(), 2000);
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false
      }}
    >
      {/* Welcome Screen */}
      <Stack.Screen 
        name="welcome"
        options={{
          animation: 'fade',
        }}
      />
      
      {/* Main App Tabs */}
      <Stack.Screen 
        name="(tabs)"
        options={{
          animation: 'fade',
        }}
      />
    </Stack>
  );
}