import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AppSessionProvider } from "@/lib/appSession";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AppSessionProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="exporter-auth" options={{ headerShown: false }} />
            <Stack.Screen name="containers-list" options={{ headerShown: false }} />
            <Stack.Screen name="container-details" options={{ headerShown: false }} />
            <Stack.Screen name="post-ad" options={{ headerShown: false }} />
            <Stack.Screen name="prices" options={{ headerShown: false }} />
            <Stack.Screen name="categories" options={{ headerShown: false }} />
            <Stack.Screen name="search" options={{ headerShown: false }} />
            <Stack.Screen name="product-insight" options={{ headerShown: false }} />
            <Stack.Screen name="inquiry-box" options={{ headerShown: false }} />
            <Stack.Screen name="upgrade" options={{ headerShown: false }} />
            <Stack.Screen name="dashboard-admin" options={{ headerShown: false }} />
            <Stack.Screen name="dashboard-seller" options={{ headerShown: false }} />
            <Stack.Screen name="dashboard-buyer" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="dark" />
        </AppSessionProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
