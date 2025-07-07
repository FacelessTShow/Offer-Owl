import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface PushNotificationConfig {
  projectId: string;
  apiKey: string;
  senderId: string;
  appId: string;
  apnsKeyId?: string;
  apnsTeamId?: string;
  apnsP8FilePath?: string;
}

export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}

class PushNotificationManager {
  private isConfigured = false;
  private expoPushToken: string | null = null;

  constructor() {
    this.initialize();
  }

  async initialize(): Promise<void> {
    try {
      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Request permissions if on device
      if (Device.isDevice) {
        await this.requestPermissions();
        await this.registerForPushNotificationsAsync();
      } else {
        console.warn('Push notifications only work on physical devices');
      }

      this.isConfigured = true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  }

  async requestPermissions(): Promise<NotificationPermissionStatus> {
    let finalStatus;
    
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        return {
          granted: false,
          canAskAgain: existingStatus === 'undetermined',
          status: finalStatus
        };
      }
    } else {
      return {
        granted: false,
        canAskAgain: false,
        status: 'unavailable'
      };
    }

    return {
      granted: true,
      canAskAgain: false,
      status: finalStatus
    };
  }

  async registerForPushNotificationsAsync(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('Must use physical device for Push Notifications');
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return null;
      }

      // Get the Expo push token
      this.expoPushToken = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;

      console.log('Expo Push Token:', this.expoPushToken);

      // Configure for Android
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return this.expoPushToken;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  getPushToken(): string | null {
    return this.expoPushToken;
  }

  async sendLocalNotification(
    title: string,
    body: string,
    data?: any,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: trigger || null,
    });
  }

  async sendPushNotificationToServer(
    pushToken: string,
    title: string,
    body: string,
    data?: any
  ): Promise<boolean> {
    try {
      const message = {
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
        channelId: 'default',
      };

      // Send to your backend server
      const response = await fetch('/api/push-notifications/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      return response.ok;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  async sendDirectExpoPush(
    pushToken: string,
    title: string,
    body: string,
    data?: any
  ): Promise<boolean> {
    try {
      const message = {
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      return result.data?.[0]?.status === 'ok';
    } catch (error) {
      console.error('Error sending Expo push notification:', error);
      return false;
    }
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  // Notification listeners
  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  addNotificationResponseReceivedListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  removeNotificationSubscription(subscription: Notifications.Subscription): void {
    Notifications.removeNotificationSubscription(subscription);
  }

  // Test notifications for development
  async sendTestNotification(): Promise<void> {
    await this.sendLocalNotification(
      'Test Notification',
      'This is a test notification from PriceTracker Pro!',
      { test: true },
      { seconds: 2, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL }
    );
  }

  async scheduleTestNotification(seconds: number = 10): Promise<string> {
    return await this.sendLocalNotification(
      'Scheduled Test',
      `This notification was scheduled ${seconds} seconds ago!`,
      { scheduled: true },
      { seconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL }
    );
  }

  // Production notification templates
  async sendPriceDropNotification(
    pushToken: string,
    productName: string,
    currentPrice: number,
    originalPrice: number,
    retailer: string
  ): Promise<boolean> {
    const discount = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
    
    return await this.sendDirectExpoPush(
      pushToken,
      '💰 Price Drop Alert!',
      `${productName} dropped to $${currentPrice} (${discount}% off) at ${retailer}`,
      {
        type: 'price_drop',
        productName,
        currentPrice,
        originalPrice,
        retailer,
        discount
      }
    );
  }

  async sendFlashDealNotification(
    pushToken: string,
    productName: string,
    price: number,
    retailer: string,
    hoursLeft: number
  ): Promise<boolean> {
    return await this.sendDirectExpoPush(
      pushToken,
      '⚡ Flash Deal Alert!',
      `${productName} - Limited time offer! Only ${hoursLeft}h left at $${price} on ${retailer}`,
      {
        type: 'flash_deal',
        productName,
        price,
        retailer,
        hoursLeft
      }
    );
  }

  async sendAchievementNotification(
    pushToken: string,
    achievementTitle: string,
    points: number
  ): Promise<boolean> {
    return await this.sendDirectExpoPush(
      pushToken,
      '🏆 Achievement Unlocked!',
      `${achievementTitle} - You earned ${points} points!`,
      {
        type: 'achievement',
        achievementTitle,
        points
      }
    );
  }
}

// Notification configuration for app.json/app.config.js
export const notificationConfig = {
  expo: {
    notification: {
      icon: './assets/notification-icon.png',
      color: '#FF6B6B',
      sounds: ['./assets/sounds/notification.wav'],
      androidMode: 'default',
      androidCollapsedTitle: 'Price Alerts',
    },
    plugins: [
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#FF6B6B',
          sounds: ['./assets/sounds/notification.wav'],
          mode: 'production',
        },
      ],
    ],
  },
};

// Firebase configuration template
export const firebaseConfig = {
  // Add your Firebase config here
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'your-api-key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'your-project-id',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'your-project.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'your-sender-id',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || 'your-app-id',
};

// APNs configuration for iOS
export const apnsConfig = {
  keyId: process.env.APNS_KEY_ID || 'your-apns-key-id',
  teamId: process.env.APNS_TEAM_ID || 'your-team-id',
  key: process.env.APNS_PRIVATE_KEY || 'path-to-your-p8-file',
  production: process.env.NODE_ENV === 'production',
};

export const pushNotificationManager = new PushNotificationManager();