# Stage 6: Mobile App Development

## Overview
Build React Native/Expo mobile app with wheel feature, instant offers, push notifications for price alerts, and quick checkout.

## Objectives
- Set up Expo project
- Build wheel UI for mobile
- Implement authentication
- Add push notifications
- Create booking flow
- Build user profile and alerts management
- Deploy to App Store and Google Play

---

## 1. Expo Project Setup

### Initialize Project

```bash
cd packages
npx create-expo-app mobile --template
cd mobile

# Install dependencies
npx expo install \
  expo-router \
  expo-notifications \
  expo-location \
  @react-navigation/native \
  @react-navigation/stack \
  react-native-gesture-handler \
  react-native-reanimated \
  @stripe/stripe-react-native \
  axios \
  zustand

# Install dev dependencies
npm install --save-dev @types/react @types/react-native
```

### Project Structure

```
packages/mobile/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx           # Home/Wheel
│   │   ├── explore.tsx         # Destinations
│   │   ├── bookings.tsx        # My Bookings
│   │   └── profile.tsx         # Profile
│   ├── destination/[id].tsx    # Destination detail
│   ├── checkout.tsx            # Checkout flow
│   ├── auth/
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── _layout.tsx
├── components/
│   ├── Wheel/
│   │   ├── WheelCanvas.tsx
│   │   └── WheelSpinner.tsx
│   ├── OfferCard.tsx
│   ├── PriceBadge.tsx
│   └── CheckoutForm.tsx
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   ├── notifications.ts
│   └── storage.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useNotifications.ts
│   └── useLocation.ts
├── store/
│   └── authStore.ts
├── app.json
└── package.json
```

---

## 2. API Client Setup

**packages/mobile/lib/api.ts:**
```typescript
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, clear auth
      await SecureStore.deleteItemAsync('auth_token');
      // Redirect to login
    }
    return Promise.reject(error);
  }
);
```

---

## 3. Authentication

**packages/mobile/lib/auth.ts:**
```typescript
import * as SecureStore from 'expo-secure-store';
import { apiClient } from './api';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export async function login(email: string, password: string): Promise<User> {
  const response = await apiClient.post('/auth/login', { email, password });
  await SecureStore.setItemAsync('auth_token', response.data.token);
  return response.data.user;
}

export async function register(data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<User> {
  const response = await apiClient.post('/auth/register', data);
  await SecureStore.setItemAsync('auth_token', response.data.token);
  return response.data.user;
}

export async function logout() {
  await apiClient.post('/auth/logout');
  await SecureStore.deleteItemAsync('auth_token');
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await apiClient.get('/users/me');
    return response.data;
  } catch (error) {
    return null;
  }
}
```

**packages/mobile/store/authStore.ts:**
```typescript
import { create } from 'zustand';
import { User, login as apiLogin, logout as apiLogout, getCurrentUser } from '../lib/auth';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    const user = await apiLogin(email, password);
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    await apiLogout();
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    set({ isLoading: true });
    const user = await getCurrentUser();
    set({ user, isAuthenticated: !!user, isLoading: false });
  },
}));
```

---

## 4. Wheel Component (Mobile)

**packages/mobile/components/Wheel/WheelCanvas.tsx:**
```typescript
import React, { useRef, useState } from 'react';
import { View, Animated, Dimensions, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';

interface Destination {
  id: string;
  city: string;
  country: string;
}

interface WheelCanvasProps {
  destinations: Destination[];
  onComplete: (destination: Destination) => void;
}

export function WheelCanvas({ destinations, onComplete }: WheelCanvasProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;

  const segmentAngle = 360 / destinations.length;
  const { width } = Dimensions.get('window');
  const wheelSize = width * 0.8;

  const handleSpin = () => {
    if (isSpinning) return;

    setIsSpinning(true);

    const randomIndex = Math.floor(Math.random() * destinations.length);
    const targetRotation = 360 * 5 + randomIndex * segmentAngle;

    Animated.timing(rotation, {
      toValue: targetRotation,
      duration: 4000,
      useNativeDriver: true,
    }).start(() => {
      setIsSpinning(false);
      onComplete(destinations[randomIndex]);
    });
  };

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.wheelContainer,
          { transform: [{ rotate: rotateInterpolate }] },
        ]}
      >
        <Svg width={wheelSize} height={wheelSize} viewBox="0 0 400 400">
          <G>
            {destinations.map((dest, index) => {
              const angle = index * segmentAngle;
              const nextAngle = (index + 1) * segmentAngle;

              const startX = 200 + 200 * Math.cos(((angle - 90) * Math.PI) / 180);
              const startY = 200 + 200 * Math.sin(((angle - 90) * Math.PI) / 180);
              const endX = 200 + 200 * Math.cos(((nextAngle - 90) * Math.PI) / 180);
              const endY = 200 + 200 * Math.sin(((nextAngle - 90) * Math.PI) / 180);

              const pathData = `M 200 200 L ${startX} ${startY} A 200 200 0 0 1 ${endX} ${endY} Z`;

              const colors = [
                '#FF6B6B',
                '#4ECDC4',
                '#45B7D1',
                '#FFA07A',
                '#98D8C8',
                '#FFD93D',
                '#6BCF7F',
                '#C77DFF',
              ];

              return (
                <G key={dest.id}>
                  <Path d={pathData} fill={colors[index % colors.length]} stroke="white" strokeWidth="2" />
                  <SvgText
                    x="200"
                    y="90"
                    textAnchor="middle"
                    fill="white"
                    fontSize="14"
                    fontWeight="bold"
                    transform={`rotate(${angle + segmentAngle / 2} 200 200)`}
                  >
                    {dest.city}
                  </SvgText>
                </G>
              );
            })}
            <Circle cx="200" cy="200" r="30" fill="white" stroke="#333" strokeWidth="2" />
          </G>
        </Svg>
      </Animated.View>

      <TouchableOpacity
        style={styles.spinButton}
        onPress={handleSpin}
        disabled={isSpinning}
      >
        <Text style={styles.spinButtonText}>
          {isSpinning ? 'Spinning...' : 'SPIN!'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  wheelContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  spinButton: {
    position: 'absolute',
    backgroundColor: '#667eea',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  spinButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
```

---

## 5. Push Notifications

**packages/mobile/lib/notifications.ts:**
```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiClient } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

export async function savePushToken(token: string) {
  try {
    await apiClient.post('/users/push-token', { token });
  } catch (error) {
    console.error('Failed to save push token:', error);
  }
}

export function setupNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationTapped: (response: Notifications.NotificationResponse) => void
) {
  const receivedListener = Notifications.addNotificationReceivedListener(onNotificationReceived);

  const responseListener = Notifications.addNotificationResponseReceivedListener(
    onNotificationTapped
  );

  return () => {
    Notifications.removeNotificationSubscription(receivedListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}
```

**packages/mobile/hooks/useNotifications.ts:**
```typescript
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  registerForPushNotifications,
  savePushToken,
  setupNotificationListeners,
} from '../lib/notifications';

export function useNotifications() {
  const router = useRouter();

  useEffect(() => {
    // Register for push notifications
    registerForPushNotifications().then((token) => {
      if (token) {
        savePushToken(token);
      }
    });

    // Setup listeners
    const cleanup = setupNotificationListeners(
      (notification) => {
        console.log('Notification received:', notification);
      },
      (response) => {
        // Handle notification tap
        const data = response.notification.request.content.data;

        if (data.type === 'price_alert' && data.offerId) {
          router.push(`/checkout?offerId=${data.offerId}`);
        }
      }
    );

    return cleanup;
  }, []);
}
```

---

## 6. Home Screen (Wheel)

**packages/mobile/app/(tabs)/index.tsx:**
```typescript
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { WheelCanvas } from '../../components/Wheel/WheelCanvas';
import { OfferCard } from '../../components/OfferCard';
import { apiClient } from '../../lib/api';
import { useNotifications } from '../../hooks/useNotifications';

export default function HomeScreen() {
  const [destinations, setDestinations] = useState([]);
  const [result, setResult] = useState<any>(null);
  const [offers, setOffers] = useState([]);

  useNotifications();

  useEffect(() => {
    loadDestinations();
  }, []);

  const loadDestinations = async () => {
    try {
      const response = await apiClient.get('/destinations/featured');
      setDestinations(response.data.slice(0, 12));
    } catch (error) {
      console.error('Failed to load destinations:', error);
    }
  };

  const handleSpinComplete = async (destination: any) => {
    try {
      const response = await apiClient.post('/wheel/spin', {
        destinationId: destination.id,
      });

      setResult(destination);
      setOffers(response.data.offers);
    } catch (error) {
      console.error('Failed to get offers:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Where will you go?</Text>
        <Text style={styles.subtitle}>Spin the wheel and discover your next adventure!</Text>
      </View>

      <WheelCanvas destinations={destinations} onComplete={handleSpinComplete} />

      {result && offers.length > 0 && (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>🎉 You're going to {result.city}!</Text>

          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  results: {
    padding: 20,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
});
```

---

## 7. Checkout Flow

**packages/mobile/app/checkout.tsx:**
```typescript
import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StripeProvider, CardField, useConfirmPayment } from '@stripe/stripe-react-native';
import { apiClient } from '../lib/api';

export default function CheckoutScreen() {
  const { offerId } = useLocalSearchParams();
  const router = useRouter();
  const { confirmPayment } = useConfirmPayment();

  const [cardDetails, setCardDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!cardDetails?.complete) {
      alert('Please enter complete card details');
      return;
    }

    setLoading(true);

    try {
      // Create booking
      const bookingResponse = await apiClient.post('/bookings', {
        offerId,
        passengers: [
          { type: 'adult', firstName: 'John', lastName: 'Doe' }, // TODO: Get from form
        ],
      });

      // Confirm payment
      const { error } = await confirmPayment(bookingResponse.data.paymentIntent.clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        alert(`Payment failed: ${error.message}`);
        return;
      }

      // Confirm booking
      await apiClient.post(`/bookings/${bookingResponse.data.booking.id}/confirm`);

      router.push(`/bookings/${bookingResponse.data.booking.id}`);
    } catch (error: any) {
      alert(`Booking failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Checkout</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Passenger Details</Text>
          {/* TODO: Add passenger form */}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <CardField
            postalCodeEnabled={false}
            onCardChange={(cardDetails) => setCardDetails(cardDetails)}
            style={styles.cardField}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCheckout}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Processing...' : 'Complete Booking'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  cardField: {
    height: 50,
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

---

## 8. EAS Build Configuration

**packages/mobile/eas.json:**
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.traveltomorrow.be"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

**packages/mobile/app.json:**
```json
{
  "expo": {
    "name": "TravelTomorrow",
    "slug": "traveltomorrow",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "be.traveltomorrow.app",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "We use your location to find the nearest airport"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "be.traveltomorrow.app",
      "permissions": ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"]
    },
    "plugins": [
      "expo-router",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff"
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "YOUR_PROJECT_ID"
      }
    }
  }
}
```

---

## 9. Deployment

### Build Commands

```bash
# Development build
eas build --profile development --platform ios
eas build --profile development --platform android

# Preview build
eas build --profile preview --platform all

# Production build
eas build --profile production --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

---

## Deliverables

- [ ] Expo project configured
- [ ] Wheel UI for mobile
- [ ] Authentication flow
- [ ] Push notifications setup
- [ ] Checkout flow with Stripe
- [ ] Bookings management
- [ ] Price alerts management
- [ ] EAS build configuration
- [ ] App deployed to TestFlight/Play Console

## Success Criteria

1. ✅ App runs on iOS and Android
2. ✅ Wheel spins smoothly
3. ✅ Users can book trips
4. ✅ Push notifications work
5. ✅ Payment processing functional
6. ✅ App submitted to stores
7. ✅ Performance >60fps

## Timeline

**Estimated Duration:** 3-4 weeks

---

**Next Stage:** [07-admin-dashboard.md](./07-admin-dashboard.md)
